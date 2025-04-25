import { query } from './db';

// Interface pour tout objet dynamique permettant l'accès aux propriétés par string
interface DynamicObject {
  [key: string]: any;
}

// Étendre les interfaces de base pour permettre l'accès dynamique aux propriétés
interface Associate extends DynamicObject {
  id: number;
  name: string;
  profession: string;
  isManager: boolean;
  joinDate: string;
  patientCount: number | null;
  participationWeight: string;
}

interface RcpAttendance extends DynamicObject {
  id: number;
  rcpId: number;
  associateId: number;
  attended: boolean;
  // Permettre des alternatives pour la compatibilité snake_case/camelCase
  rcp_id?: number;
  associate_id?: number;
}

interface ProjectAssignment extends DynamicObject {
  id: number;
  projectId: number;
  associateId: number;
  contribution: string;
  // Permettre des alternatives pour la compatibilité snake_case/camelCase
  project_id?: number;
  associate_id?: number;
}

interface Project extends DynamicObject {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  weight: string;
  assignmentCount?: number;
}

interface AccessoryMission extends DynamicObject {
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

interface MissionAssignment extends DynamicObject {
  id: number;
  missionId: number;
  associateId: number;
  contributionPercentage: string;
  // Permettre des alternatives pour la compatibilité snake_case/camelCase
  mission_id?: number;
  associate_id?: number;
}

interface RcpMeeting extends DynamicObject {
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

/**
 * Fonction utilitaire pour accéder à une propriété de manière flexible (camelCase ou snake_case)
 * @param obj L'objet dans lequel chercher la propriété
 * @param baseProperty Le nom de base de la propriété (sans préfixe)
 * @param idSuffix Si true, ajoute "_id" ou "Id" comme suffixe
 * @param prefix Un préfixe optionnel (comme "rcp" ou "project")
 * @returns La valeur de la propriété ou undefined si non trouvée
 */
function getProperty(obj: DynamicObject, baseProperty: string, idSuffix: boolean = false, prefix?: string): any {
  // Construire toutes les variantes possibles du nom de propriété
  const variants: string[] = [];
  
  if (prefix) {
    // Variantes avec préfixe
    if (idSuffix) {
      variants.push(`${prefix}_${baseProperty}_id`);  // snake_case (ex: project_associate_id)
      variants.push(`${prefix}_${baseProperty}Id`);   // mixed (ex: project_associateId)
      variants.push(`${prefix}${baseProperty.charAt(0).toUpperCase() + baseProperty.slice(1)}Id`); // camelCase (ex: projectAssociateId)
      variants.push(`${prefix.toLowerCase()}Id`);     // simplified (ex: projectId)
      variants.push(`${prefix.toLowerCase()}_id`);    // simplified snake (ex: project_id)
    } else {
      variants.push(`${prefix}_${baseProperty}`);     // snake_case (ex: project_contribution)
      variants.push(`${prefix}${baseProperty.charAt(0).toUpperCase() + baseProperty.slice(1)}`); // camelCase (ex: projectContribution)
    }
  } else {
    // Variantes sans préfixe
    if (idSuffix) {
      variants.push(`${baseProperty}_id`);            // snake_case (ex: associate_id)
      variants.push(`${baseProperty}Id`);             // camelCase (ex: associateId)
    } else {
      variants.push(baseProperty);                    // as is (ex: contribution)
    }
  }
  
  // Chercher la première variante qui existe dans l'objet
  for (const variant of variants) {
    if (variant in obj) {
      return obj[variant];
    }
  }
  
  // Si on arrive ici, aucune variante n'a été trouvée
  return undefined;
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
        // Utiliser notre fonction utilitaire pour accéder aux propriétés de manière flexible
        const rcpIdNum = Number(getProperty(attendance, 'id', true, 'rcp')) || 
                        Number(attendance.rcpId) || 
                        Number(attendance.rcp_id);
        
        const associateIdNum = Number(getProperty(attendance, 'id', true, 'associate')) || 
                              Number(attendance.associateId) || 
                              Number(attendance.associate_id);
        
        if (!rcpIdNum || !associateIdNum) {
          console.log("Présence ignorée: impossible de déterminer rcpId ou associateId", attendance);
          continue;
        }
        
        console.log(`Traitement de la présence: rcpId=${rcpIdNum}, associateId=${associateIdNum}`);
        
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
        
        // Pour debug: Afficher l'exemple d'une affectation et ses propriétés
        if (projectAssignments.length > 0) {
          console.log("Structure des assignations de projet:", 
            Object.keys(projectAssignments[0]),
            projectAssignments[0]
          );
        }
        
        // Calculer la contribution des projets
        for (const assignment of projectAssignments) {
          // Utiliser notre fonction utilitaire pour accéder aux propriétés de manière flexible
          const projectId = Number(getProperty(assignment, 'id', true, 'project')) ||
                           Number(assignment.projectId) ||
                           Number(assignment.project_id);
                           
          const associateId = Number(getProperty(assignment, 'id', true, 'associate')) ||
                             Number(assignment.associateId) ||
                             Number(assignment.associate_id);
          
          const contributionValue = getProperty(assignment, 'contribution') ||
                                   assignment.contribution;
          
          const assignmentContribution = parseFloat(String(contributionValue) || '1.0');
          
          if (!projectId || !associateId) {
            console.log("Affectation ignorée: impossible de déterminer projectId ou associateId", assignment);
            continue;
          }
          
          // Trouver le projet correspondant
          const project = projects.find(p => Number(p.id) === projectId);
          
          if (project) {
            const projectWeight = parseFloat(project.weight || '1.0');
            const weightedContribution = projectWeight * assignmentContribution;
            
            contributionByAssociate[associateId] = (contributionByAssociate[associateId] || 0) + weightedContribution;
            totalContribution += weightedContribution;
            console.log(`Affectation: projectId=${projectId}, associateId=${associateId}, contribution=${assignmentContribution}`);
            console.log(`  Contribution pondérée: ${weightedContribution} (poids projet: ${projectWeight}, contribution: ${assignmentContribution})`);
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
          // Utiliser notre fonction utilitaire pour accéder aux propriétés de manière flexible
          const missionId = Number(getProperty(assignment, 'id', true, 'mission')) ||
                           Number(assignment.missionId) ||
                           Number(assignment.mission_id);
                           
          const associateId = Number(getProperty(assignment, 'id', true, 'associate')) ||
                             Number(assignment.associateId) ||
                             Number(assignment.associate_id);
          
          const contributionValue = getProperty(assignment, 'contributionPercentage') ||
                                   getProperty(assignment, 'contribution') ||
                                   assignment.contributionPercentage || 
                                   assignment.contribution;
          
          if (!missionId || !associateId) {
            console.log("Assignation de mission ignorée: impossible de déterminer missionId ou associateId", assignment);
            continue;
          }
          
          // Trouver la mission correspondante
          const mission = accessoryMissions.find(m => Number(m.id) === missionId);
          
          if (mission) {
            // Utiliser le budget comme poids supplémentaire pour les missions importantes
            const missionBudget = parseFloat(mission.budget || '0');
            // La contribution en pourcentage est déjà stockée (normalement entre 0 et 100)
            const assignmentContribution = parseFloat(String(contributionValue) || '100') / 100;
            
            // Pondérer la contribution par le budget pour donner plus de poids aux missions importantes
            // Pour éviter des divisions par zéro, utiliser au moins 1.0 comme budget minimum
            const effectiveBudget = Math.max(missionBudget, 1.0);
            const weightedContribution = effectiveBudget * assignmentContribution;
            
            console.log(`Match trouvé! Mission: ${mission.title}, AssociateID: ${associateId}, Contribution: ${assignmentContribution}, Budget: ${missionBudget}, Weighted: ${weightedContribution}`);
            
            contributionByAssociate[associateId] = (contributionByAssociate[associateId] || 0) + weightedContribution;
            totalContribution += weightedContribution;
          } else {
            console.log(`Warning: Mission not found for assignment: missionId=${missionId}, looking in list of ids: [${accessoryMissions.map(m => `${m.id}`).join(', ')}]`);
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
      
      // Utiliser notre fonction utilitaire pour filtrer
      const attendances = rcpAttendances.filter(a => {
        const rcpId = Number(getProperty(a, 'id', true, 'rcp')) || 
                     Number(a.rcpId) || 
                     Number(a.rcp_id);
        return rcpId === meetingId;
      });
      
      meeting.attendanceCount = attendances.length;
    }
    
    // Calculer les temps de présence par associé
    const attendanceByAssociate: Record<number, number> = {};
    for (const attendance of rcpAttendances) {
      // Utiliser notre fonction utilitaire pour accéder aux propriétés
      const rcpIdNum = Number(getProperty(attendance, 'id', true, 'rcp')) || 
                      Number(attendance.rcpId) || 
                      Number(attendance.rcp_id);
      
      const associateIdNum = Number(getProperty(attendance, 'id', true, 'associate')) || 
                            Number(attendance.associateId) || 
                            Number(attendance.associate_id);
      
      if (!rcpIdNum || !associateIdNum) {
        console.log("Présence ignorée pour l'interface: impossible de déterminer rcpId ou associateId", attendance);
        continue;
      }
      
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
      // Utiliser notre fonction utilitaire pour filtrer les affectations
      const assignments = projectAssignments.filter(a => {
        const projectId = Number(getProperty(a, 'id', true, 'project')) ||
                         Number(a.projectId) ||
                         Number(a.project_id);
        return projectId === Number(project.id);
      });
      
      project.assignmentCount = assignments.length;
      console.log(`Projet ${project.id} (${project.title}): ${assignments.length} contributions`);
    }
    
    // Calculer les contributions par associé
    const contribuByAssociate: Record<number, number> = {};
    let totalContrib = 0;
    
    for (const assignment of projectAssignments) {
      // Utiliser notre fonction utilitaire pour accéder aux propriétés
      const projectId = Number(getProperty(assignment, 'id', true, 'project')) ||
                       Number(assignment.projectId) ||
                       Number(assignment.project_id);
                       
      const associateId = Number(getProperty(assignment, 'id', true, 'associate')) ||
                         Number(assignment.associateId) ||
                         Number(assignment.associate_id);
      
      const contributionValue = getProperty(assignment, 'contribution') ||
                               assignment.contribution;
      
      if (!projectId || !associateId) {
        console.log("Affectation ignorée pour l'interface: impossible de déterminer projectId ou associateId", assignment);
        continue;
      }
      
      console.log(`Affectation: projectId=${projectId}, associateId=${associateId}, contribution=${contributionValue}`);
      
      const project = projects.find(p => Number(p.id) === projectId);
      if (project) {
        const projectWeight = parseFloat(project.weight || '1.0');
        const assignmentContribution = parseFloat(String(contributionValue) || '1.0');
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
      // Utiliser notre fonction utilitaire pour accéder aux propriétés
      const associateId = Number(getProperty(assignment, 'id', true, 'associate')) ||
                         Number(assignment.associateId) ||
                         Number(assignment.associate_id);
      
      if (associateId) {
        projectsPerAssociate[associateId] = (projectsPerAssociate[associateId] || 0) + 1;
      }
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