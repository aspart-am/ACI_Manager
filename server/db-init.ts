import { query } from "./db";

async function createTables() {
  try {
    console.log("Vérification et création des tables si besoin...");
    
    // Création de la table users
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user'
      )
    `);
    
    // Création de la table associates
    await query(`
      CREATE TABLE IF NOT EXISTS associates (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        profession VARCHAR(255) NOT NULL,
        is_manager BOOLEAN NOT NULL DEFAULT false,
        join_date DATE NOT NULL,
        patient_count INTEGER,
        participation_weight VARCHAR(20) NOT NULL DEFAULT '1.0'
      )
    `);
    
    // Création de la table expenses
    await query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        amount VARCHAR(20) NOT NULL,
        date DATE NOT NULL,
        is_recurring BOOLEAN NOT NULL DEFAULT false,
        frequency VARCHAR(50)
      )
    `);
    
    // Création de la table revenues
    await query(`
      CREATE TABLE IF NOT EXISTS revenues (
        id SERIAL PRIMARY KEY,
        source VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        amount VARCHAR(20) NOT NULL,
        date DATE NOT NULL,
        category VARCHAR(100) NOT NULL
      )
    `);
    
    // Création de la table rcp_meetings
    await query(`
      CREATE TABLE IF NOT EXISTS rcp_meetings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        date DATE NOT NULL
      )
    `);
    
    // Création de la table rcp_attendance
    await query(`
      CREATE TABLE IF NOT EXISTS rcp_attendance (
        id SERIAL PRIMARY KEY,
        rcp_id INTEGER NOT NULL REFERENCES rcp_meetings(id) ON DELETE CASCADE,
        associate_id INTEGER NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
        attended BOOLEAN NOT NULL DEFAULT false,
        UNIQUE(rcp_id, associate_id)
      )
    `);
    
    // Création de la table projects
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        weight VARCHAR(20) NOT NULL DEFAULT '1.0'
      )
    `);
    
    // Création de la table project_assignments
    await query(`
      CREATE TABLE IF NOT EXISTS project_assignments (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        associate_id INTEGER NOT NULL REFERENCES associates(id) ON DELETE CASCADE,
        contribution VARCHAR(20) NOT NULL DEFAULT '1.0',
        UNIQUE(project_id, associate_id)
      )
    `);
    
    // Création de la table settings
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT
      )
    `);
    
    console.log("Vérification/création des tables terminée");
    return true;
  } catch (error) {
    console.error("Erreur lors de la vérification/création des tables:", error);
    throw error;
  }
}

async function insertDefaultSettings() {
  try {
    console.log('Vérification des paramètres par défaut...');
    
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
      const existingResult = await query(
        'SELECT id FROM settings WHERE key = $1',
        [setting.key]
      );
      
      if (existingResult.rows.length === 0) {
        // Insérer seulement s'il n'existe pas déjà
        await query(
          'INSERT INTO settings(key, value, category, description) VALUES($1, $2, $3, $4)',
          [setting.key, setting.value, setting.category, setting.description]
        );
        console.log(`Paramètre '${setting.key}' inséré`);
      }
    }
    
    console.log('Vérification des paramètres par défaut terminée');
    
  } catch (error) {
    console.error('Erreur lors de la vérification des paramètres par défaut:', error);
    throw error;
  }
}

async function insertDemoData() {
  try {
    console.log('Vérification des données de démo...');
    
    // Vérifier si nous avons déjà des données
    const existingResult = await query('SELECT COUNT(*) as count FROM associates');
    const count = parseInt(existingResult.rows[0]?.count || '0');
    
    if (count > 0) {
      console.log("Les données de démo existent déjà");
      return;
    }
    
    console.log('Insertion des données de démo pour les associés...');
    
    // Demo associates
    const demoAssociates = [
      {
        name: "Dr. Rousseau",
        profession: "Médecin généraliste",
        isManager: true,
        joinDate: "2020-01-01",
        patientCount: 980,
        participationWeight: "1.5"
      },
      {
        name: "Dr. Martin",
        profession: "Médecin généraliste",
        isManager: false,
        joinDate: "2020-03-15",
        patientCount: 850,
        participationWeight: "1.0"
      },
      {
        name: "Mme. Dupont",
        profession: "Infirmière",
        isManager: false,
        joinDate: "2021-06-01",
        patientCount: 0,
        participationWeight: "1.0"
      },
      {
        name: "M. Bernard",
        profession: "Kinésithérapeute",
        isManager: true,
        joinDate: "2022-01-15",
        patientCount: 0,
        participationWeight: "1.3"
      }
    ];
    
    // Insérer les associés
    for (const associate of demoAssociates) {
      await query(
        'INSERT INTO associates(name, profession, is_manager, join_date, patient_count, participation_weight) VALUES($1, $2, $3, $4, $5, $6)',
        [
          associate.name,
          associate.profession,
          associate.isManager,
          associate.joinDate,
          associate.patientCount,
          associate.participationWeight
        ]
      );
    }
    
    console.log('Insertion des données de démo pour les revenus...');
    
    // Demo revenues
    const demoRevenues = [
      {
        source: "CPAM",
        description: "1er versement ACI",
        amount: "19125",
        date: "2024-01-15",
        category: "ACI"
      },
      {
        source: "CPAM",
        description: "2ème versement ACI",
        amount: "19125",
        date: "2024-04-15",
        category: "ACI"
      },
      {
        source: "CPAM",
        description: "3ème versement ACI",
        amount: "19125",
        date: "2024-07-15",
        category: "ACI"
      },
      {
        source: "ARS",
        description: "Subvention projet prévention",
        amount: "7500",
        date: "2024-02-10",
        category: "Subvention"
      }
    ];
    
    // Insérer les revenus
    for (const revenue of demoRevenues) {
      await query(
        'INSERT INTO revenues(source, description, amount, date, category) VALUES($1, $2, $3, $4, $5)',
        [
          revenue.source,
          revenue.description,
          revenue.amount,
          revenue.date,
          revenue.category
        ]
      );
    }
    
    console.log('Insertion des données de démo pour les dépenses...');
    
    // Demo expenses
    const demoExpenses = [
      {
        category: "Loyer",
        description: "Loyer mensuel",
        amount: "2500",
        date: "2024-01-01",
        isRecurring: true,
        frequency: "monthly"
      },
      {
        category: "Électricité",
        description: "Facture électricité",
        amount: "350",
        date: "2024-01-15",
        isRecurring: true,
        frequency: "monthly"
      },
      {
        category: "Matériel médical",
        description: "Achat matériel de diagnostic",
        amount: "1200",
        date: "2024-03-10",
        isRecurring: false,
        frequency: null
      },
      {
        category: "Logiciel",
        description: "Abonnement logiciel de gestion",
        amount: "180",
        date: "2024-01-05",
        isRecurring: true,
        frequency: "monthly"
      }
    ];
    
    // Insérer les dépenses
    for (const expense of demoExpenses) {
      await query(
        'INSERT INTO expenses(category, description, amount, date, is_recurring, frequency) VALUES($1, $2, $3, $4, $5, $6)',
        [
          expense.category,
          expense.description,
          expense.amount,
          expense.date,
          expense.isRecurring,
          expense.frequency
        ]
      );
    }
    
    console.log('Insertion des données de démo pour les réunions RCP...');
    
    // Demo RCP meetings
    const demoRcpMeetings = [
      {
        date: "2024-01-10",
        title: "RCP Mensuelle Janvier",
        description: "Réunion mensuelle de coordination pluriprofessionnelle"
      },
      {
        date: "2024-02-14",
        title: "RCP Mensuelle Février",
        description: "Réunion mensuelle de coordination pluriprofessionnelle"
      },
      {
        date: "2024-03-13",
        title: "RCP Mensuelle Mars",
        description: "Réunion mensuelle de coordination pluriprofessionnelle"
      }
    ];
    
    // Insérer les réunions RCP
    for (const meeting of demoRcpMeetings) {
      await query(
        'INSERT INTO rcp_meetings(date, title, description) VALUES($1, $2, $3)',
        [
          meeting.date,
          meeting.title,
          meeting.description
        ]
      );
    }
    
    console.log('Insertion des données de démo pour les projets...');
    
    // Demo Projects
    const demoProjects = [
      {
        title: "Prévention Diabète",
        description: "Projet de prévention du diabète pour les patients à risque",
        startDate: "2024-02-01",
        endDate: "2024-08-31",
        status: "active",
        weight: "1.5"
      },
      {
        title: "Téléconsultation",
        description: "Mise en place d'un système de téléconsultation",
        startDate: "2024-01-15",
        endDate: "2024-06-30",
        status: "active",
        weight: "1.2"
      }
    ];
    
    // Insérer les projets
    for (const project of demoProjects) {
      await query(
        'INSERT INTO projects(title, description, start_date, end_date, status, weight) VALUES($1, $2, $3, $4, $5, $6)',
        [
          project.title,
          project.description,
          project.startDate,
          project.endDate,
          project.status,
          project.weight
        ]
      );
    }
    
    console.log('Données de démo insérées avec succès');
    
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données de démo:', error);
    throw error;
  }
}

export async function initializeDatabase() {
  try {
    // Créer les tables
    await createTables();
    
    // Insérer les paramètres par défaut
    await insertDefaultSettings();
    
    // Insérer les données de démo
    await insertDemoData();
    
    return true;
  } catch (error) {
    console.error("Erreur lors de l'initialisation de la base de données:", error);
    throw error;
  }
}