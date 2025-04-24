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
  assignmentCount?: number;
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
  duration?: string;
  attendanceCount?: number;
}

interface DistributionResult {
  totalAciRevenue: number;
  totalRevenue: number;
  associateShares: AssociateShare[];
  // Nouvelles propriétés pour afficher des détails dans l'interface
  rcpMeetings?: RcpMeeting[];
  projects?: Project[];
  rcpAttendance?: Record<number, { minutes: number; percentage: number }>;
  projectContributions?: Record<number, { projectCount: number; percentage: number }>;
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
    console.log("======== Début du calcul de distribution ========");
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
      // 8.2 Récupérer toutes les présences RCP marquées comme "attended = true" directement dans la requête
      const rcpAttendancesResult = await query("SELECT * FROM rcp_attendance WHERE attended = true");
      // Convertir les résultats en objets RcpAttendance - debug pour voir les données récupérées
      console.log("Présences RCP avec attended=true:", rcpAttendancesResult.rows.length);
      const rcpAttendances: RcpAttendance[] = rcpAttendancesResult.rows;
      
      // 8.3 Calculer le temps de présence par associé (en minutes)
      const attendanceTimeByAssociate: Record<number, number> = {};
      
      // Analyse des structures de données pour trouver les bons noms de propriétés
      console.log("Types de données RCP: ", {
        firstMeeting: rcpMeetings.length > 0 ? rcpMeetings[0] : null,
        firstAttendance: rcpAttendances.length > 0 ? rcpAttendances[0] : null,
        columns: rcpAttendances.length > 0 ? Object.keys(rcpAttendances[0]) : []
      });
      
      for (const attendance of rcpAttendances) {
        // Utilisons les propriétés disponibles dans l'objet attendance
        // Les propriétés peuvent être nommées différemment selon comment drizzle les récupère
        // Nous devons nous adapter aux données telles qu'elles sont
        const propNames = Object.keys(attendance);
        
        // Trouver les propriétés qui contiennent "rcp" et "associate"
        const rcpProp = propNames.find(p => p.toLowerCase().includes('rcp')) || 'rcpId';
        const associateProp = propNames.find(p => p.toLowerCase().includes('associate')) || 'associateId';
        
        const rcpIdNum = Number(attendance[rcpProp]);
        const associateIdNum = Number(attendance[associateProp]);
        
        console.log(`Traitement de la présence: ${rcpProp}=${rcpIdNum}, ${associateProp}=${associateIdNum}`);
        
        // Trouver la réunion correspondante pour obtenir la durée
        const meeting = rcpMeetings.find(m => Number(m.id) === rcpIdNum);
        
        if (meeting) {
          console.log(`Réunion trouvée: ${meeting.title}, durée=${meeting.duration || 60} minutes`);
          // Utilise la durée de la réunion, ou 60 minutes par défaut
          const meetingDuration = meeting.duration ? Number(meeting.duration) : 60;
          attendanceTimeByAssociate[associateIdNum] = (attendanceTimeByAssociate[associateIdNum] || 0) + meetingDuration;
          console.log(`Temps cumulé pour l'associé ${associateIdNum}: ${attendanceTimeByAssociate[associateIdNum]} minutes`);
        } else {
          console.log(`Réunion non trouvée pour rcpId=${rcpIdNum}. Ids disponibles: ${rcpMeetings.map(m => m.id).join(', ')}`);
        }
      }
      
      console.log("Temps de présence aux RCP par associé:", attendanceTimeByAssociate);
      
      // 8.4 Calculer le temps total de présence
      const totalAttendanceTime = Object.values(attendanceTimeByAssociate).reduce((sum, time) => sum + time, 0) || 1; // Éviter division par zéro
      
      console.log("Temps total de présence aux RCP:", totalAttendanceTime, "minutes");
      
      // 8.5 Calculer la part RCP pour chaque associé basée sur le temps de présence
      for (const associateId in attendanceTimeByAssociate) {
        const percentageShare = attendanceTimeByAssociate[parseInt(associateId)] / totalAttendanceTime;
        rcpShares[parseInt(associateId)] = percentageShare * totalRcpShare;
        console.log(`Associé ${associateId}: ${attendanceTimeByAssociate[parseInt(associateId)]} minutes (${percentageShare * 100}%) = ${rcpShares[parseInt(associateId)]} €`);
      }
    } else {
      // Si pas de réunions RCP, distribuer également
      for (const associate of associates) {
        rcpShares[associate.id] = totalRcpShare / associates.length;
      }
      console.log("Pas de réunions RCP, distribution égale:", totalRcpShare / associates.length, "€ par associé");
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
          
          // Debug: Afficher toutes les missions accessoires disponibles
          accessoryMissions.forEach(mission => {
            console.log(`Mission disponible: id=${mission.id}, title=${mission.title}, budget=${mission.budget}`);
          });
          
          // Debug: Afficher toutes les assignations
          missionAssignments.forEach(assignment => {
            console.log(`Assignment disponible: id=${assignment.id}, missionId=${assignment.missionId}, associateId=${assignment.associateId}, contribution=${assignment.contributionPercentage}`);
          });
        } catch (error) {
          console.log("Table mission_assignments non disponible, ignorée dans le calcul");
          // La table n'existe pas encore, ignorer pour le moment
        }
        
        // Calculer la contribution des missions accessoires
        for (const assignment of missionAssignments) {
          // Convertir les IDs en nombres pour s'assurer de la comparaison correcte
          const missionIdNum = Number(assignment.missionId);
          
          // Trouver la mission correspondante
          const mission = accessoryMissions.find(m => Number(m.id) === missionIdNum);
          
          if (mission) {
            // Utiliser le budget comme poids supplémentaire pour les missions importantes
            const missionBudget = parseFloat(mission.budget || '0');
            // La contribution en pourcentage est déjà stockée (normalement entre 0 et 100)
            const assignmentContribution = parseFloat(assignment.contributionPercentage || '100') / 100;
            
            // Pondérer la contribution par le budget pour donner plus de poids aux missions importantes
            // Pour éviter des divisions par zéro, utiliser au moins 1.0 comme budget minimum
            const effectiveBudget = Math.max(missionBudget, 1.0);
            const weightedContribution = effectiveBudget * assignmentContribution;
            
            console.log(`Match trouvé! Mission: ${mission.title}, AssociateID: ${assignment.associateId}, Contribution: ${assignmentContribution}, Budget: ${missionBudget}, Weighted: ${weightedContribution}`);
            
            const associateIdNum = Number(assignment.associateId);
            contributionByAssociate[associateIdNum] = (contributionByAssociate[associateIdNum] || 0) + weightedContribution;
            totalContribution += weightedContribution;
          } else {
            console.log(`Warning: Mission not found for assignment: missionId=${assignment.missionId} (${typeof assignment.missionId}), looking in list of ids: [${accessoryMissions.map(m => `${m.id} (${typeof m.id})`).join(', ')}]`);
          }
        }
      }
      
      // 9.8 Calculer la part projet/mission pour chaque associé
      if (totalContribution > 0) {
        console.log("Total contribution: ", totalContribution);
        console.log("Total project share: ", totalProjectShare);
        console.log("Contributions by associate: ", JSON.stringify(contributionByAssociate));
        
        for (const associateId in contributionByAssociate) {
          projectShares[parseInt(associateId)] = (contributionByAssociate[parseInt(associateId)] / totalContribution) * totalProjectShare;
          console.log(`Associate ${associateId} gets ${projectShares[parseInt(associateId)]} (${(contributionByAssociate[parseInt(associateId)] / totalContribution) * 100}%)`);
        }
      } else {
        console.log("WARNING: No contributions found, distributing equally");
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
    
    // Calcul des informations de RCP pour l'interface UI
    const rcpAttendanceInfo: Record<number, { minutes: number; percentage: number }> = {};
    
    // Récupérer les données des présences aux RCP (uniquement les présents)
    const rcpAttendancesResult = await query("SELECT * FROM rcp_attendance WHERE attended = true");
    // Conversion en tableau d'objets RcpAttendance
    const rcpAttendances: RcpAttendance[] = rcpAttendancesResult.rows;
    
    // Mettre à jour les réunions RCP avec le nombre de participants
    for (const meeting of rcpMeetings) {
      // Conversion explicite de l'ID en nombre
      const meetingId = Number(meeting.id);
      
      // Filtrer en utilisant une approche plus dynamique pour éviter les problèmes de noms de propriétés
      const attendances = rcpAttendances.filter(a => {
        const propNames = Object.keys(a);
        const rcpProp = propNames.find(p => p.toLowerCase().includes('rcp')) || 'rcpId';
        return Number(a[rcpProp]) === meetingId;
      });
      
      meeting.attendanceCount = attendances.length;
    }
    
    // Calculer les temps de présence par associé
    const attendanceByAssociate: Record<number, number> = {};
    for (const attendance of rcpAttendances) {
      // Utiliser une approche dynamique pour trouver les propriétés
      const propNames = Object.keys(attendance);
      const rcpProp = propNames.find(p => p.toLowerCase().includes('rcp')) || 'rcpId';
      const associateProp = propNames.find(p => p.toLowerCase().includes('associate')) || 'associateId';
      
      const rcpIdNum = Number(attendance[rcpProp]);
      const associateIdNum = Number(attendance[associateProp]);
      
      // Trouver la réunion correspondante
      const meeting = rcpMeetings.find(m => Number(m.id) === rcpIdNum);
      if (meeting) {
        const meetingDuration = meeting.duration ? Number(meeting.duration) : 60;
        attendanceByAssociate[associateIdNum] = (attendanceByAssociate[associateIdNum] || 0) + meetingDuration;
      }
    }
    
    // Calculer le temps total et les pourcentages
    const totalAttendanceTime = Object.values(attendanceByAssociate).reduce((sum: number, time: number) => sum + time, 0) || 1;
    for (const associateId in attendanceByAssociate) {
      const minutes = attendanceByAssociate[parseInt(associateId)];
      const percentage = minutes / totalAttendanceTime;
      rcpAttendanceInfo[parseInt(associateId)] = { minutes, percentage };
    }
    
    // Préparer les informations sur les projets pour l'interface
    const projectContributionsInfo: Record<number, { projectCount: number; percentage: number }> = {};
    
    // Récupérer toutes les affectations de projet
    const projectAssignmentsResult = await query("SELECT * FROM project_assignments");
    const projectAssignments: ProjectAssignment[] = projectAssignmentsResult.rows;
    
    // Analyse des structures de données pour les projets
    console.log("Structure des assignations de projet:", 
      projectAssignments.length > 0 ? Object.keys(projectAssignments[0]) : [],
      projectAssignments.length > 0 ? projectAssignments[0] : null
    );
    
    // Mettre à jour les projets avec le nombre de contributeurs
    for (const project of projects) {
      // Utiliser une approche dynamique pour détecter les noms de propriétés
      const assignments = projectAssignments.filter(a => {
        const props = Object.keys(a);
        const projectIdProp = props.find(p => p.toLowerCase().includes('project_id')) || 'projectId';
        return Number(a[projectIdProp]) === Number(project.id);
      });
      
      project.assignmentCount = assignments.length;
      console.log(`Projet ${project.id} (${project.title}): ${assignments.length} contributions`);
    }
    
    // Calculer les contributions par associé
    const contribuByAssociate: Record<number, number> = {};
    let totalContrib = 0;
    
    for (const assignment of projectAssignments) {
      // Récupérer les noms de propriétés de manière dynamique
      const props = Object.keys(assignment);
      const projectIdProp = props.find(p => p.toLowerCase().includes('project_id')) || 'projectId';
      const associateIdProp = props.find(p => p.toLowerCase().includes('associate_id')) || 'associateId';
      const contributionProp = props.find(p => p.toLowerCase().includes('contribution')) || 'contribution';
      
      const projectId = Number(assignment[projectIdProp]);
      const associateId = Number(assignment[associateIdProp]);
      
      console.log(`Affectation: projectId=${projectId}, associateId=${associateId}, contribution=${assignment[contributionProp]}`);
      
      const project = projects.find(p => Number(p.id) === projectId);
      if (project) {
        const projectWeight = parseFloat(project.weight || '1.0');
        const assignmentContribution = parseFloat(String(assignment[contributionProp]) || '1.0');
        const weightedContrib = projectWeight * assignmentContribution;
        
        console.log(`  Contribution pondérée: ${weightedContrib} (poids projet: ${projectWeight}, contribution: ${assignmentContribution})`);
        
        contribuByAssociate[associateId] = (contribuByAssociate[associateId] || 0) + weightedContrib;
        totalContrib += weightedContrib;
      } else {
        console.log(`  Projet non trouvé pour l'ID ${projectId}`);
      }
    }
    
    // Compter les projets par associé
    const projectsPerAssociate: Record<number, number> = {};
    for (const assignment of projectAssignments) {
      // Récupérer les noms de propriétés de manière dynamique
      const props = Object.keys(assignment);
      const associateIdProp = props.find(p => p.toLowerCase().includes('associate_id')) || 'associateId';
      const associateId = Number(assignment[associateIdProp]);
      
      projectsPerAssociate[associateId] = (projectsPerAssociate[associateId] || 0) + 1;
    }
    
    // Calculer les pourcentages si on a des contributions
    if (totalContrib > 0) {
      for (const associateId in contribuByAssociate) {
        const percentage = contribuByAssociate[parseInt(associateId)] / totalContrib;
        projectContributionsInfo[parseInt(associateId)] = {
          projectCount: projectsPerAssociate[parseInt(associateId)] || 0,
          percentage
        };
      }
    }
    
    // Ajouter des informations pour l'interface
    const result: DistributionResult = {
      totalAciRevenue,
      totalRevenue,
      associateShares,
      rcpMeetings,
      projects,
      rcpAttendance: rcpAttendanceInfo,
      projectContributions: projectContributionsInfo
    };
    
    return result;
  } catch (error) {
    console.error('Erreur lors du calcul de la distribution:', error);
    throw error;
  }
}