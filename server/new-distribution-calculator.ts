// Utiliser le stockage JSON au lieu de PostgreSQL
import { storage } from './storage';

/**
 * Interface pour les résultats de la distribution
 */
interface DistributionResult {
  totalAciRevenue: number;
  totalRevenue: number;
  associateShares: AssociateShare[];
  // Détails pour l'interface utilisateur
  rcpMeetings?: any[];
  projects?: any[];
  rcpAttendance?: Record<number, { minutes: number; percentage: number }>;
  projectContributions?: Record<number, { projectCount: number; percentage: number }>;
}

/**
 * Interface pour la part calculée pour chaque associé
 */
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
 * Fonction principale pour calculer la distribution des revenus entre associés
 * @param year L'année pour laquelle calculer la distribution (par défaut: année en cours)
 */
export async function calculateDistribution(year: number = new Date().getFullYear()): Promise<DistributionResult> {
  try {
    console.log("======== Début du calcul de distribution ========");
    
    // 1. Récupérer tous les paramètres nécessaires
    const fixedShareSetting = await storage.getSetting('fixed_revenue_share');
    const rcpShareSetting = await storage.getSetting('rcp_share');
    const projectShareSetting = await storage.getSetting('project_share');
    const managerWeightSetting = await storage.getSetting('aci_manager_weight');
    
    // Si les paramètres n'existent pas, utilisez les valeurs par défaut
    const fixedSharePercentage = parseFloat(fixedShareSetting?.value || '0.5');
    const rcpSharePercentage = parseFloat(rcpShareSetting?.value || '0.25');
    const projectSharePercentage = parseFloat(projectShareSetting?.value || '0.25');
    const managerWeight = parseFloat(managerWeightSetting?.value || '1.5');
    
    console.log(`Répartition des revenus: ${fixedSharePercentage*100}% fixe, ${rcpSharePercentage*100}% RCP, ${projectSharePercentage*100}% projets`);
    console.log(`Coefficient managers: ${managerWeight}`);
    
    // 2. Charger toutes les données nécessaires
    const allRevenues = await storage.getRevenues();
    const expenses = await storage.getExpenses();
    const associates = await storage.getAssociates();
    const rcpMeetings = await storage.getRcpMeetings();
    
    // Récupérer les présences RCP pour toutes les réunions
    let rcpAttendances: any[] = [];
    for (const meeting of rcpMeetings) {
      const meetingAttendances = await storage.getRcpAttendances(meeting.id);
      rcpAttendances = [...rcpAttendances, ...meetingAttendances];
    }
    
    const projects = await storage.getProjects();
    
    // Récupérer les assignations de projets pour tous les projets
    let projectAssignments: any[] = [];
    for (const project of projects) {
      const assignments = await storage.getProjectAssignments(project.id);
      projectAssignments = [...projectAssignments, ...assignments];
    }
    
    // 3. Calculer les revenus et dépenses
    // Filtrer les revenus ACI de l'année spécifiée
    console.log(`Calcul de la distribution pour l'année: ${year}`);
    const currentYearRevenues = allRevenues.filter(
      rev => new Date(rev.date).getFullYear() === year
    );
    
    const aciRevenues = currentYearRevenues.filter(rev => rev.category === 'ACI');
    const totalAciRevenue = aciRevenues.reduce((sum, rev) => sum + parseFloat(rev.amount), 0);
    const totalRevenue = currentYearRevenues.reduce((sum, rev) => sum + parseFloat(rev.amount), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    
    // 4. Calculer le montant net à distribuer (revenu ACI - dépenses)
    const netAmount = totalAciRevenue - totalExpenses;
    
    console.log(`Revenus ACI: ${totalAciRevenue} €`);
    console.log(`Total des dépenses: ${totalExpenses} €`);
    console.log(`Montant net à distribuer: ${netAmount} €`);
    
    // 5. Vérifier qu'il y a un montant positif à distribuer et des associés
    if (netAmount <= 0 || associates.length === 0) {
      console.log("Aucun montant à distribuer ou aucun associé");
      return {
        totalAciRevenue,
        totalRevenue,
        associateShares: []
      };
    }
    
    // 6. Calculer les parts de distribution
    
    // 6.1 Part fixe (50% par défaut)
    const totalFixedShare = netAmount * fixedSharePercentage;
    console.log(`Part fixe totale: ${totalFixedShare} € (${fixedSharePercentage * 100}%)`);
    
    // 6.2 Calculer le poids total des associés (pondéré pour les managers)
    let totalWeight = 0;
    for (const associate of associates) {
      // Si l'associé est un manager (cogérant), appliquer la pondération
      const weight = associate.isManager 
        ? parseFloat(associate.participationWeight) * managerWeight 
        : parseFloat(associate.participationWeight);
      totalWeight += weight;
    }
    console.log(`Poids total des associés: ${totalWeight}`);
    
    // 6.3 Calculer la part fixe par associé
    const fixedShares: Record<number, number> = {};
    for (const associate of associates) {
      // Si l'associé est un manager (cogérant), appliquer la pondération
      const weight = associate.isManager 
        ? parseFloat(associate.participationWeight) * managerWeight 
        : parseFloat(associate.participationWeight);
      
      // Calculer la part proportionnelle au poids pondéré
      fixedShares[associate.id] = (weight / totalWeight) * totalFixedShare;
      console.log(`${associate.name}: poids ${weight} = ${fixedShares[associate.id]} € (${(weight/totalWeight*100).toFixed(2)}%)`);
    }
    
    // 6.4 Part RCP (25% par défaut)
    const totalRcpShare = netAmount * rcpSharePercentage;
    console.log(`Part RCP totale: ${totalRcpShare} € (${rcpSharePercentage * 100}%)`);
    
    // 6.5 Calculer les parts liées aux présences RCP
    const rcpShares: Record<number, number> = {};
    
    // Filtrer les présences pour ne garder que celles marquées comme "attended"
    const presentRcpAttendances = rcpAttendances.filter(att => att.attended);
    console.log(`Nombre de présences RCP: ${presentRcpAttendances.length}`);
    
    if (presentRcpAttendances.length > 0) {
      // Calculer le temps de présence par associé
      const attendanceTimeByAssociate: Record<number, number> = {};
      
      for (const attendance of presentRcpAttendances) {
        const rcpId = attendance.rcpId;
        const associateId = attendance.associateId;
        
        // Trouver la réunion correspondante
        const meeting = rcpMeetings.find(m => m.id === rcpId);
        
        if (meeting) {
          // Utiliser la durée de la réunion ou 60 minutes par défaut
          const meetingDuration = meeting.duration ? parseInt(meeting.duration.toString()) : 60;
          attendanceTimeByAssociate[associateId] = (attendanceTimeByAssociate[associateId] || 0) + meetingDuration;
        }
      }
      
      // Calculer le temps total de présence
      const totalAttendanceTime = Object.values(attendanceTimeByAssociate).reduce((sum, time) => sum + time, 0) || 1;
      console.log(`Temps total de présence RCP: ${totalAttendanceTime} minutes`);
      
      // Calculer la part proportionnelle au temps de présence
      for (const associateId in attendanceTimeByAssociate) {
        const percentage = attendanceTimeByAssociate[parseInt(associateId)] / totalAttendanceTime;
        rcpShares[parseInt(associateId)] = percentage * totalRcpShare;
        console.log(`Associé ${associateId}: ${attendanceTimeByAssociate[parseInt(associateId)]} minutes (${(percentage*100).toFixed(2)}%) = ${rcpShares[parseInt(associateId)].toFixed(2)} €`);
      }
    } else {
      // Si pas de présences RCP, distribuer équitablement
      for (const associate of associates) {
        rcpShares[associate.id] = totalRcpShare / associates.length;
      }
      console.log("Pas de présences RCP, distribution égale.");
    }
    
    // 6.6 Part projets (25% par défaut)
    const totalProjectShare = netAmount * projectSharePercentage;
    console.log(`Part projets totale: ${totalProjectShare} € (${projectSharePercentage * 100}%)`);
    
    // 6.7 Calculer les parts liées aux projets
    const projectShares: Record<number, number> = {};
    
    // Filtrer les projets actifs
    const activeProjects = projects.filter(p => p.status === 'active');
    console.log(`Nombre de projets actifs: ${activeProjects.length}`);
    
    if (activeProjects.length > 0 && projectAssignments.length > 0) {
      // Calculer la contribution par associé
      let totalContribution = 0;
      const contributionByAssociate: Record<number, number> = {};
      
      // D'abord, calculer le total des contributions par projet pour normalisation
      const projectTotals: Record<number, { total: number, weight: number }> = {};
      
      for (const project of activeProjects) {
        const projectId = project.id;
        const assignments = projectAssignments.filter(a => a.projectId === projectId);
        const total = assignments.reduce((sum, a) => sum + parseFloat(a.contribution), 0);
        const weight = parseFloat(project.weight?.toString() || '1.0');
        
        projectTotals[projectId] = { total, weight };
      }
      
      // Ensuite, traiter chaque affectation
      for (const assignment of projectAssignments) {
        const projectId = assignment.projectId;
        const associateId = assignment.associateId;
        let contributionValue = parseFloat(assignment.contribution);
        
        // Trouver le projet correspondant
        const project = activeProjects.find(p => p.id === projectId);
        
        if (project) {
          const projectTotal = projectTotals[projectId]?.total || 100;
          const projectWeight = projectTotals[projectId]?.weight || 1.0;
          
          // Normaliser la contribution si nécessaire
          if (projectTotal !== 100 && projectTotal > 0) {
            contributionValue = (contributionValue / projectTotal) * 100;
          }
          
          // Pondérer la contribution par le poids du projet
          const weightedContribution = projectWeight * contributionValue;
          
          console.log(`Projet ${project.id} (${project.title}): poids ${projectWeight}, contribution ${contributionValue}%, pondérée ${weightedContribution}`);
          
          contributionByAssociate[associateId] = (contributionByAssociate[associateId] || 0) + weightedContribution;
          totalContribution += weightedContribution;
        }
      }
      
      // Calculer la part proportionnelle à la contribution
      if (totalContribution > 0) {
        for (const associateId in contributionByAssociate) {
          const percentage = contributionByAssociate[parseInt(associateId)] / totalContribution;
          projectShares[parseInt(associateId)] = percentage * totalProjectShare;
          console.log(`Associé ${associateId}: contribution ${contributionByAssociate[parseInt(associateId)]} (${(percentage*100).toFixed(2)}%) = ${projectShares[parseInt(associateId)].toFixed(2)} €`);
        }
      } else {
        // Si pas de contributions, distribuer équitablement
        for (const associate of associates) {
          projectShares[associate.id] = totalProjectShare / associates.length;
        }
      }
    } else {
      // Si pas de projets, distribuer équitablement
      for (const associate of associates) {
        projectShares[associate.id] = totalProjectShare / associates.length;
      }
      console.log("Pas de projets actifs, distribution égale.");
    }
    
    // 7. Calculer les parts totales pour chaque associé
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
        percentageShare: 0 // Sera calculé ensuite
      };
    });
    
    // 8. Calculer les pourcentages relatifs
    const totalDistributed = associateShares.reduce((sum, share) => sum + share.totalShare, 0);
    for (const share of associateShares) {
      share.percentageShare = (share.totalShare / totalDistributed) * 100;
    }
    
    // 9. Trier par part totale décroissante
    associateShares.sort((a, b) => b.totalShare - a.totalShare);
    
    // 10. Préparer les informations détaillées pour l'interface utilisateur
    
    // 10.1 Information sur les présences RCP par associé
    const rcpAttendanceInfo: Record<number, { minutes: number; percentage: number }> = {};
    const presentAttendances = rcpAttendances.filter(att => att.attended);
    
    if (presentAttendances.length > 0) {
      const attendanceTimeByAssociate: Record<number, number> = {};
      
      for (const attendance of presentAttendances) {
        const rcpId = attendance.rcpId;
        const associateId = attendance.associateId;
        
        const meeting = rcpMeetings.find(m => m.id === rcpId);
        if (meeting) {
          const meetingDuration = meeting.duration ? parseInt(meeting.duration.toString()) : 60;
          attendanceTimeByAssociate[associateId] = (attendanceTimeByAssociate[associateId] || 0) + meetingDuration;
        }
      }
      
      const totalTime = Object.values(attendanceTimeByAssociate).reduce((sum, time) => sum + time, 0) || 1;
      
      for (const associateId in attendanceTimeByAssociate) {
        const minutes = attendanceTimeByAssociate[parseInt(associateId)];
        const percentage = minutes / totalTime;
        rcpAttendanceInfo[parseInt(associateId)] = { minutes, percentage };
      }
    }
    
    // 10.2 Information sur les contributions aux projets par associé
    const projectContributionsInfo: Record<number, { projectCount: number; percentage: number }> = {};
    
    if (projectAssignments.length > 0) {
      const projectCountByAssociate: Record<number, number> = {};
      const totalAssignments = projectAssignments.length;
      
      for (const assignment of projectAssignments) {
        const associateId = assignment.associateId;
        projectCountByAssociate[associateId] = (projectCountByAssociate[associateId] || 0) + 1;
      }
      
      for (const associateId in projectCountByAssociate) {
        const projectCount = projectCountByAssociate[parseInt(associateId)];
        const percentage = projectCount / totalAssignments;
        projectContributionsInfo[parseInt(associateId)] = { projectCount, percentage };
      }
    }
    
    // 11. Retourner le résultat final
    return {
      totalAciRevenue,
      totalRevenue,
      associateShares,
      rcpMeetings,
      projects: activeProjects,
      rcpAttendance: rcpAttendanceInfo,
      projectContributions: projectContributionsInfo
    };
    
  } catch (error) {
    console.error("Erreur lors du calcul de la distribution:", error);
    throw new Error("Failed to calculate distribution: " + error);
  }
}