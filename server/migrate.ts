import { db } from "./db";
import { sql } from "drizzle-orm";
import * as schema from "../shared/schema";
import { associates, expenses, projects, rcpAttendance, rcpMeetings, revenues, settings } from "@shared/schema";
import { eq } from "drizzle-orm";

// Fonction pour initialiser les paramètres par défaut
async function initializeDefaultSettings() {
  const defaultSettings = [
    {
      key: "aci_manager_weight",
      value: "1.5",
      category: "distribution",
      description: "Weight factor for managers in ACI distribution"
    },
    {
      key: "rcp_attendance_weight",
      value: "0.8",
      category: "distribution",
      description: "Weight factor for RCP meeting attendance in ACI distribution"
    },
    {
      key: "project_contribution_weight",
      value: "1.2",
      category: "distribution",
      description: "Weight factor for project contributions in ACI distribution"
    }
  ];
  
  for (const setting of defaultSettings) {
    // Vérifier si le paramètre existe déjà
    const existing = await db.select().from(settings).where(eq(settings.key, setting.key));
    if (existing.length === 0) {
      // Insérer seulement s'il n'existe pas déjà
      await db.insert(settings).values(setting);
    }
  }
}

// Fonction pour initialiser les données de démo
async function initializeDemoData() {
  // Vérifier si nous avons déjà des données
  const existingAssociates = await db.select().from(associates);
  
  if (existingAssociates.length > 0) {
    console.log("Les données de démo existent déjà");
    return;
  }
  
  // Demo associates
  const demoAssociates = [
    {
      name: "Dr. Rousseau",
      profession: "Médecin généraliste",
      isManager: true,
      joinDate: new Date("2020-01-01"),
      patientCount: 980,
      participationWeight: "1.5"
    },
    {
      name: "Dr. Martin",
      profession: "Médecin généraliste",
      isManager: false,
      joinDate: new Date("2020-03-15"),
      patientCount: 850,
      participationWeight: "1.0"
    },
    {
      name: "Mme. Dupont",
      profession: "Infirmière",
      isManager: false,
      joinDate: new Date("2021-06-01"),
      patientCount: 0,
      participationWeight: "1.0"
    },
    {
      name: "M. Bernard",
      profession: "Kinésithérapeute",
      isManager: true,
      joinDate: new Date("2022-01-15"),
      patientCount: 0,
      participationWeight: "1.3"
    }
  ];
  
  // Insérer les associés
  for (const associate of demoAssociates) {
    await db.insert(associates).values(associate);
  }
  
  // Demo revenues
  const demoRevenues = [
    {
      source: "CPAM",
      description: "1er versement ACI",
      amount: "19125",
      date: new Date("2024-01-15"),
      category: "ACI"
    },
    {
      source: "CPAM",
      description: "2ème versement ACI",
      amount: "19125",
      date: new Date("2024-04-15"),
      category: "ACI"
    },
    {
      source: "CPAM",
      description: "3ème versement ACI",
      amount: "19125",
      date: new Date("2024-07-15"),
      category: "ACI"
    },
    {
      source: "ARS",
      description: "Subvention projet prévention",
      amount: "7500",
      date: new Date("2024-02-10"),
      category: "Subvention"
    }
  ];
  
  // Insérer les revenus
  for (const revenue of demoRevenues) {
    await db.insert(revenues).values(revenue);
  }
  
  // Demo expenses
  const demoExpenses = [
    {
      category: "Loyer",
      description: "Loyer mensuel",
      amount: "2500",
      date: new Date("2024-01-01"),
      isRecurring: true,
      frequency: "monthly"
    },
    {
      category: "Électricité",
      description: "Facture électricité",
      amount: "350",
      date: new Date("2024-01-15"),
      isRecurring: true,
      frequency: "monthly"
    },
    {
      category: "Matériel médical",
      description: "Achat matériel de diagnostic",
      amount: "1200",
      date: new Date("2024-03-10"),
      isRecurring: false
    },
    {
      category: "Logiciel",
      description: "Abonnement logiciel de gestion",
      amount: "180",
      date: new Date("2024-01-05"),
      isRecurring: true,
      frequency: "monthly"
    }
  ];
  
  // Insérer les dépenses
  for (const expense of demoExpenses) {
    await db.insert(expenses).values(expense);
  }
  
  // Demo RCP meetings
  const demoRcpMeetings = [
    {
      date: new Date("2024-01-10"),
      title: "RCP Mensuelle Janvier",
      description: "Réunion mensuelle de coordination pluriprofessionnelle"
    },
    {
      date: new Date("2024-02-14"),
      title: "RCP Mensuelle Février",
      description: "Réunion mensuelle de coordination pluriprofessionnelle"
    },
    {
      date: new Date("2024-03-13"),
      title: "RCP Mensuelle Mars",
      description: "Réunion mensuelle de coordination pluriprofessionnelle"
    }
  ];
  
  // Insérer les réunions RCP
  for (const meeting of demoRcpMeetings) {
    await db.insert(rcpMeetings).values(meeting);
  }
  
  // Demo Projects
  const demoProjects = [
    {
      title: "Prévention Diabète",
      description: "Projet de prévention du diabète pour les patients à risque",
      startDate: new Date("2024-02-01"),
      endDate: new Date("2024-08-31"),
      status: "active",
      weight: "1.5"
    },
    {
      title: "Téléconsultation",
      description: "Mise en place d'un système de téléconsultation",
      startDate: new Date("2024-01-15"),
      endDate: new Date("2024-06-30"),
      status: "active",
      weight: "1.2"
    }
  ];
  
  // Insérer les projets
  for (const project of demoProjects) {
    await db.insert(projects).values(project);
  }
}

async function runDrizzlePush() {
  const { exec } = require('child_process');
  
  return new Promise<void>((resolve, reject) => {
    console.log("Exécution de drizzle-kit push...");
    
    exec('npx drizzle-kit push', (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Erreur d'exécution: ${error}`);
        reject(error);
        return;
      }
      
      console.log(`Sortie standard: ${stdout}`);
      
      if (stderr) {
        console.error(`Erreur standard: ${stderr}`);
      }
      
      resolve();
    });
  });
}

async function main() {
  try {
    console.log("Migration de la base de données...");
    
    // Utiliser drizzle-kit pour pousser le schéma vers la base de données
    console.log("Création des tables...");
    await runDrizzlePush();
    
    console.log("Création des tables terminée");
    
    // Initialiser les paramètres par défaut
    console.log("Initialisation des paramètres par défaut...");
    await initializeDefaultSettings();
    
    // Initialiser les données de démo
    console.log("Initialisation des données de démo...");
    await initializeDemoData();
    
    console.log("Migration terminée avec succès");
    
    process.exit(0);
  } catch (error) {
    console.error("Erreur lors de la migration :", error);
    process.exit(1);
  }
}

// Exécuter la migration
main().catch((e) => {
  console.error("Erreur non interceptée :", e);
  process.exit(1);
});