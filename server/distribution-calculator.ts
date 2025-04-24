import { query } from './db';

interface Associate {
  id: number;
  name: string;
  profession: string;
  isManager: boolean;
  joinDate: string;
  patientCount: number | null;
  participationWeight: string;
}

interface RcpAttendance {
  id: number;
  rcpId: number;
  associateId: number;
  attended: boolean;
}

interface ProjectAssignment {
  id: number;
  projectId: number;
  associateId: number;
  contribution: string;
}

interface Project {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  weight: string;
}

interface RcpMeeting {
  id: number;
  title: string;
  description: string | null;
  date: string;
}

interface DistributionResult {
  totalAciRevenue: number;
  totalRevenue: number;
  associateShares: AssociateShare[];
}

interface AssociateShare {
  associateId: number;
  associateName: string;
  profession: string;
  isManager: boolean;
  baseShare: number;           // Part fixe (50% des revenus)
  rcpShare: number;            // Part liée aux présences RCP (25% des revenus)
  projectShare: number;        // Part liée aux missions (25% des revenus)
  totalShare: number;          // Somme des trois parts
  percentageShare: number;     // Pourcentage du total
}

export async function calculateDistribution(): Promise<DistributionResult> {
  try {
    // 1. Récupérer les paramètres nécessaires
    const fixedShareResult = await query("SELECT value FROM settings WHERE key = 'fixed_revenue_share'");
    const rcpShareResult = await query("SELECT value FROM settings WHERE key = 'rcp_share'");
    const projectShareResult = await query("SELECT value FROM settings WHERE key = 'project_share'");
    
    // Si les paramètres n'existent pas, utilisez les valeurs par défaut
    const fixedSharePercentage = parseFloat(fixedShareResult.rows[0]?.value || '0.5');
    const rcpSharePercentage = parseFloat(rcpShareResult.rows[0]?.value || '0.25');
    const projectSharePercentage = parseFloat(projectShareResult.rows[0]?.value || '0.25');
    
    // 2. Récupérer les revenus ACI
    const revenuesResult = await query("SELECT SUM(CAST(amount AS DECIMAL)) AS total FROM revenues WHERE category = 'ACI'");
    const totalAciRevenue = parseFloat(revenuesResult.rows[0]?.total || '0');
    
    // 3. Récupérer tous les revenus
    const allRevenuesResult = await query("SELECT SUM(CAST(amount AS DECIMAL)) AS total FROM revenues");
    const totalRevenue = parseFloat(allRevenuesResult.rows[0]?.total || '0');
    
    // 4. Récupérer tous les associés
    const associatesResult = await query("SELECT * FROM associates ORDER BY name");
    const associates: Associate[] = associatesResult.rows;
    
    if (associates.length === 0) {
      return {
        totalAciRevenue,
        totalRevenue,
        associateShares: []
      };
    }
    
    // 5. Calculer la part fixe par associé (50% divisé également)
    const baseSharePerAssociate = (totalAciRevenue * fixedSharePercentage) / associates.length;
    
    // 6. Calculer la part RCP (25%)
    let rcpShares: Record<number, number> = {};
    const totalRcpShare = totalAciRevenue * rcpSharePercentage;
    
    // 6.1 Récupérer toutes les réunions RCP
    const rcpMeetingsResult = await query("SELECT * FROM rcp_meetings");
    const rcpMeetings: RcpMeeting[] = rcpMeetingsResult.rows;
    
    if (rcpMeetings.length > 0) {
      // 6.2 Récupérer toutes les présences RCP
      const rcpAttendancesResult = await query("SELECT * FROM rcp_attendance WHERE attended = true");
      const rcpAttendances: RcpAttendance[] = rcpAttendancesResult.rows;
      
      // 6.3 Compter les présences par associé
      const attendanceCount: Record<number, number> = {};
      for (const attendance of rcpAttendances) {
        attendanceCount[attendance.associateId] = (attendanceCount[attendance.associateId] || 0) + 1;
      }
      
      // 6.4 Calculer le total des présences
      const totalAttendances = Object.values(attendanceCount).reduce((sum, count) => sum + count, 0) || 1; // Éviter division par zéro
      
      // 6.5 Calculer la part RCP pour chaque associé
      for (const associateId in attendanceCount) {
        rcpShares[parseInt(associateId)] = (attendanceCount[parseInt(associateId)] / totalAttendances) * totalRcpShare;
      }
    } else {
      // Si pas de réunions RCP, distribuer également
      for (const associate of associates) {
        rcpShares[associate.id] = totalRcpShare / associates.length;
      }
    }
    
    // 7. Calculer la part projet (25%)
    let projectShares: Record<number, number> = {};
    const totalProjectShare = totalAciRevenue * projectSharePercentage;
    
    // 7.1 Récupérer tous les projets
    const projectsResult = await query("SELECT * FROM projects WHERE status = 'active'");
    const projects: Project[] = projectsResult.rows;
    
    if (projects.length > 0) {
      // 7.2 Récupérer toutes les affectations de projet
      const projectAssignmentsResult = await query("SELECT * FROM project_assignments");
      const projectAssignments: ProjectAssignment[] = projectAssignmentsResult.rows;
      
      // 7.3 Calculer la contribution totale pondérée
      let totalContribution = 0;
      const contributionByAssociate: Record<number, number> = {};
      
      for (const assignment of projectAssignments) {
        const project = projects.find(p => p.id === assignment.projectId);
        if (project) {
          const projectWeight = parseFloat(project.weight || '1.0');
          const assignmentContribution = parseFloat(assignment.contribution || '1.0');
          const weightedContribution = projectWeight * assignmentContribution;
          
          contributionByAssociate[assignment.associateId] = (contributionByAssociate[assignment.associateId] || 0) + weightedContribution;
          totalContribution += weightedContribution;
        }
      }
      
      // 7.4 Calculer la part projet pour chaque associé
      if (totalContribution > 0) {
        for (const associateId in contributionByAssociate) {
          projectShares[parseInt(associateId)] = (contributionByAssociate[parseInt(associateId)] / totalContribution) * totalProjectShare;
        }
      } else {
        // Si pas de contributions, distribuer également
        for (const associate of associates) {
          projectShares[associate.id] = totalProjectShare / associates.length;
        }
      }
    } else {
      // Si pas de projets, distribuer également
      for (const associate of associates) {
        projectShares[associate.id] = totalProjectShare / associates.length;
      }
    }
    
    // 8. Calculer les parts totales pour chaque associé
    const associateShares: AssociateShare[] = associates.map(associate => {
      const baseShare = baseSharePerAssociate;
      const rcpShare = rcpShares[associate.id] || 0;
      const projectShare = projectShares[associate.id] || 0;
      const totalShare = baseShare + rcpShare + projectShare;
      
      return {
        associateId: associate.id,
        associateName: associate.name,
        profession: associate.profession,
        isManager: associate.isManager,
        baseShare,
        rcpShare,
        projectShare,
        totalShare,
        percentageShare: 0 // À calculer après
      };
    });
    
    // 9. Calculer le pourcentage de chaque associé
    const totalDistributed = associateShares.reduce((sum, share) => sum + share.totalShare, 0);
    
    if (totalDistributed > 0) {
      for (const share of associateShares) {
        share.percentageShare = (share.totalShare / totalDistributed) * 100;
      }
    }
    
    // Trier par part totale décroissante
    associateShares.sort((a, b) => b.totalShare - a.totalShare);
    
    return {
      totalAciRevenue,
      totalRevenue,
      associateShares
    };
  } catch (error) {
    console.error('Erreur lors du calcul de la distribution:', error);
    throw error;
  }
}