// Fichier de test pour vérifier les appels API

import { apiRequest } from "./lib/queryClient";

// Test pour créer une réunion RCP
export async function testCreateRcpMeeting(customDuration: number = 60) {
  try {
    const data = {
      date: "2024-04-24",
      title: "Test RCP API",
      description: "Test description",
      duration: customDuration.toString() // Convertir la durée en chaîne de caractères
    };
    
    const result = await apiRequest('/api/rcp-meetings', 'POST', data);
    console.log("Réunion RCP créée avec succès:", result);
    return result;
  } catch (error) {
    console.error("Erreur lors de la création de la réunion RCP:", error);
    throw error;
  }
}

// Test pour ajouter un associé à un projet
export async function testAddAssociateToProject(projectId: number, associateId: number) {
  try {
    const data = {
      projectId,
      associateId,
      contribution: '15' // Convertir en chaîne de caractères comme attendu par le schéma
    };
    
    const result = await apiRequest('/api/project-assignments', 'POST', data);
    console.log("Associé ajouté au projet avec succès:", result);
    return result;
  } catch (error) {
    console.error("Erreur lors de l'ajout de l'associé au projet:", error);
    throw error;
  }
}

// Test pour ajouter une présence à une réunion RCP
export async function testAddAttendanceToRcp(rcpId: number, associateId: number) {
  try {
    const data = {
      rcpId,
      associateId,
      attended: true
    };
    
    const result = await apiRequest('/api/rcp-attendances', 'POST', data);
    console.log("Présence à la réunion RCP ajoutée avec succès:", result);
    return result;
  } catch (error) {
    console.error("Erreur lors de l'ajout de la présence à la réunion RCP:", error);
    throw error;
  }
}