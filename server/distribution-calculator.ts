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

interface AccessoryMission {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  budget: string;
  type: string;
  year: number;
}

interface MissionAssignment {
  id: number;
  missionId: number;
  associateId: number;
  contributionPercentage: string;
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
  projectShare: number;        // Part liée aux missions et projets (25% des revenus)
  totalShare: number;          // Somme des trois parts
  percentageShare: number;     // Pourcentage du total
}

export async function calculateDistribution(): Promise<DistributionResult> {
  try {
    // 1. Récupérer les paramètres nécessaires
    const fixedShareResult = await query("SELECT value FROM settings WHERE key = 'fixed_revenue_share'");
    const rcpShareResult = await query("SELECT value FROM settings WHERE key = 'rcp_share'");
    const projectShareResult = await query("SELECT value FROM settings WHERE key = 'project_share'");
    const managerWeightResult = await query("SELECT value FROM settings WHERE key = 'aci_manager_weight'");
    
    // Si les paramètres n'existent pas, utilisez les valeurs par défaut
    const fixedSharePercentage = parseFloat(fixedShareResult.rows[0]?.value || '0.5');
    const rcpSharePercentage = parseFloat(rcpShareResult.rows[0]?.value || '0.25');
    const projectSharePercentage = parseFloat(projectShareResult.rows[0]?.value || '0.25');
    const managerWeight = parseFloat(managerWeightResult.rows[0]?.value || '1.5');
    
    // 2. Récupérer les revenus ACI
    const revenuesResult = await query("SELECT SUM(CAST(amount AS DECIMAL)) AS total FROM revenues WHERE category = 'ACI'");
    const totalAciRevenue = parseFloat(revenuesResult.rows[0]?.total || '0');
    
    // 3. Récupérer tous les revenus
    const allRevenuesResult = await query("SELECT SUM(CAST(amount AS DECIMAL)) AS total FROM revenues");
    const totalRevenue = parseFloat(allRevenuesResult.rows[0]?.total || '0');
    
    // 4. Récupérer toutes les dépenses
    const expensesResult = await query("SELECT SUM(CAST(amount AS DECIMAL)) AS total FROM expenses");
    const totalExpenses = parseFloat(expensesResult.rows[0]?.total || '0');
    
    // 5. Calculer le montant net à distribuer (revenu ACI - dépenses)
    const netAmount = totalAciRevenue - totalExpenses;
    
    if (netAmount <= 0) {
      return {
        totalAciRevenue,
        totalRevenue,
        associateShares: []
      };
    }
    
    // 6. Récupérer tous les associés
    const associatesResult = await query("SELECT * FROM associates ORDER BY name");
    const associates: Associate[] = associatesResult.rows;
    
    if (associates.length === 0) {
      return {
        totalAciRevenue,
        totalRevenue,
        associateShares: []
      };
    }
    
    // 7. Calculer la rémunération fixe (50% du montant net)
    const totalFixedShare = netAmount * fixedSharePercentage;
    
    // 7.1 Calculer le poids total de tous les associés (avec pondération pour les cogérants)
    let totalWeight = 0;
    for (const associate of associates) {
      const weight = associate.isManager 
        ? parseFloat(associate.participationWeight) * managerWeight
        : parseFloat(associate.participationWeight);
      totalWeight += weight;
    }
    
    // 7.2 Calculer la part fixe pour chaque associé (pondérée par le statut de cogérant)
    const fixedShares: Record<number, number> = {};
    for (const associate of associates) {
      const weight = associate.isManager 
        ? parseFloat(associate.participationWeight) * managerWeight
        : parseFloat(associate.participationWeight);
      fixedShares[associate.id] = (weight / totalWeight) * totalFixedShare;
    }
    
    // 8. Calculer la part variable liée aux réunions RCP (25% du montant net)
    let rcpShares: Record<number, number> = {};
    const totalRcpShare = netAmount * rcpSharePercentage;
    
    // 8.1 Récupérer toutes les réunions RCP
    const rcpMeetingsResult = await query("SELECT * FROM rcp_meetings");
    const rcpMeetings: RcpMeeting[] = rcpMeetingsResult.rows;
    
    if (rcpMeetings.length > 0) {
      // 8.2 Récupérer toutes les présences RCP
      const rcpAttendancesResult = await query("SELECT * FROM rcp_attendance WHERE attended = true");
      const rcpAttendances: RcpAttendance[] = rcpAttendancesResult.rows;
      
      // 8.3 Compter les présences par associé
      const attendanceCount: Record<number, number> = {};
      for (const attendance of rcpAttendances) {
        attendanceCount[attendance.associateId] = (attendanceCount[attendance.associateId] || 0) + 1;
      }
      
      // 8.4 Calculer le total des présences
      const totalAttendances = Object.values(attendanceCount).reduce((sum, count) => sum + count, 0) || 1; // Éviter division par zéro
      
      // 8.5 Calculer la part RCP pour chaque associé
      for (const associateId in attendanceCount) {
        rcpShares[parseInt(associateId)] = (attendanceCount[parseInt(associateId)] / totalAttendances) * totalRcpShare;
      }
    } else {
      // Si pas de réunions RCP, distribuer également
      for (const associate of associates) {
        rcpShares[associate.id] = totalRcpShare / associates.length;
      }
    }
    
    // 9. Calculer la part variable liée aux missions/projets (25% du montant net)
    let projectShares: Record<number, number> = {};
    const totalProjectShare = netAmount * projectSharePercentage;
    
    // 9.1 Récupérer l'année courante pour les missions accessoires
    const currentYear = new Date().getFullYear();
    
    // 9.2 Récupérer tous les projets actifs
    const projectsResult = await query("SELECT * FROM projects WHERE status = 'active'");
    const projects: Project[] = projectsResult.rows;
    
    // 9.3 Récupérer toutes les missions accessoires actives pour l'année courante
    let accessoryMissions: AccessoryMission[] = [];
    try {
      const accessoryMissionsResult = await query("SELECT * FROM accessory_missions WHERE status = 'active' AND year = $1", [currentYear]);
      accessoryMissions = accessoryMissionsResult.rows;
    } catch (error) {
      console.log("Table accessory_missions non disponible, ignorée dans le calcul");
      // La table n'existe pas encore, ignorer pour le moment
    }
    
    // 9.4 Vérifier s'il y a des projets ou des missions accessoires
    const hasProjectsOrMissions = projects.length > 0 || accessoryMissions.length > 0;
    
    if (hasProjectsOrMissions) {
      // 9.5 Initialiser la contribution totale et les contributions par associé
      let totalContribution = 0;
      const contributionByAssociate: Record<number, number> = {};
      
      // 9.6 Traiter les projets réguliers
      if (projects.length > 0) {
        // Récupérer toutes les affectations de projet
        const projectAssignmentsResult = await query("SELECT * FROM project_assignments");
        const projectAssignments: ProjectAssignment[] = projectAssignmentsResult.rows;
        
        // Calculer la contribution des projets
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
      }
      
      // 9.7 Traiter les missions accessoires
      if (accessoryMissions.length > 0) {
        // Récupérer toutes les affectations de missions accessoires
        let missionAssignments: MissionAssignment[] = [];
        try {
          const missionAssignmentsResult = await query("SELECT * FROM mission_assignments");
          missionAssignments = missionAssignmentsResult.rows;
          console.log("Missions accessoires trouvées:", accessoryMissions.length);
          console.log("Assignations de missions trouvées:", missionAssignments.length);
        } catch (error) {
          console.log("Table mission_assignments non disponible, ignorée dans le calcul");
          // La table n'existe pas encore, ignorer pour le moment
        }
        
        // Calculer la contribution des missions accessoires
        for (const assignment of missionAssignments) {
          const mission = accessoryMissions.find(m => m.id === assignment.missionId);
          if (mission) {
            // Utiliser le budget comme poids supplémentaire pour les missions importantes
            const missionBudget = parseFloat(mission.budget || '0');
            // La contribution en pourcentage est déjà stockée (normalement entre 0 et 100)
            const assignmentContribution = parseFloat(assignment.contributionPercentage || '100') / 100;
            
            // Pondérer la contribution par le budget pour donner plus de poids aux missions importantes
            // Pour éviter des divisions par zéro, utiliser au moins 1.0 comme budget minimum
            const effectiveBudget = Math.max(missionBudget, 1.0);
            const weightedContribution = effectiveBudget * assignmentContribution;
            
            console.log(`Mission: ${mission.title}, AssociateID: ${assignment.associateId}, Contribution: ${assignmentContribution}, Budget: ${missionBudget}, Weighted: ${weightedContribution}`);
            
            contributionByAssociate[assignment.associateId] = (contributionByAssociate[assignment.associateId] || 0) + weightedContribution;
            totalContribution += weightedContribution;
          } else {
            console.log(`Warning: Mission not found for assignment: missionId=${assignment.missionId}, associateId=${assignment.associateId}`);
          }
        }
      }
      
      // 9.8 Calculer la part projet/mission pour chaque associé
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
      // Si pas de projets ni de missions, distribuer également
      for (const associate of associates) {
        projectShares[associate.id] = totalProjectShare / associates.length;
      }
    }
    
    // 10. Calculer les parts totales pour chaque associé
    const associateShares: AssociateShare[] = associates.map(associate => {
      const baseShare = fixedShares[associate.id] || 0;
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
    
    // 11. Calculer le pourcentage de chaque associé
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