import { Pool } from '@neondatabase/serverless';

async function main() {
  console.log("Initialisation de la base de données...");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL non défini");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Création des tables
    console.log("Création des tables...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY,
        "username" text NOT NULL UNIQUE,
        "password" text NOT NULL,
        "full_name" text NOT NULL,
        "role" text NOT NULL DEFAULT 'user'
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "associates" (
        "id" serial PRIMARY KEY,
        "name" text NOT NULL,
        "profession" text NOT NULL,
        "is_manager" boolean NOT NULL DEFAULT false,
        "join_date" date NOT NULL,
        "patient_count" integer DEFAULT 0,
        "participation_weight" numeric NOT NULL DEFAULT '1'
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "expenses" (
        "id" serial PRIMARY KEY,
        "category" text NOT NULL,
        "description" text NOT NULL,
        "amount" numeric NOT NULL,
        "date" date NOT NULL,
        "is_recurring" boolean NOT NULL DEFAULT false,
        "frequency" text DEFAULT 'monthly'
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "revenues" (
        "id" serial PRIMARY KEY,
        "source" text NOT NULL,
        "description" text NOT NULL,
        "amount" numeric NOT NULL,
        "date" date NOT NULL,
        "category" text NOT NULL
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "rcp_meetings" (
        "id" serial PRIMARY KEY,
        "date" date NOT NULL,
        "title" text NOT NULL,
        "description" text
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" serial PRIMARY KEY,
        "title" text NOT NULL,
        "description" text,
        "start_date" date NOT NULL,
        "end_date" date,
        "status" text NOT NULL DEFAULT 'active',
        "weight" numeric NOT NULL DEFAULT '1'
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" serial PRIMARY KEY,
        "key" text NOT NULL UNIQUE,
        "value" text NOT NULL,
        "category" text NOT NULL,
        "description" text
      );
    `);
    
    // Tables avec clés étrangères
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "rcp_attendance" (
        "id" serial PRIMARY KEY,
        "rcp_id" integer NOT NULL,
        "associate_id" integer NOT NULL,
        "attended" boolean NOT NULL DEFAULT false,
        CONSTRAINT "fk_rcp_meeting"
          FOREIGN KEY("rcp_id") 
          REFERENCES "rcp_meetings"("id"),
        CONSTRAINT "fk_rcp_associate"
          FOREIGN KEY("associate_id") 
          REFERENCES "associates"("id")
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "project_assignments" (
        "id" serial PRIMARY KEY,
        "project_id" integer NOT NULL,
        "associate_id" integer NOT NULL,
        "contribution" numeric NOT NULL DEFAULT '1',
        CONSTRAINT "fk_project"
          FOREIGN KEY("project_id") 
          REFERENCES "projects"("id"),
        CONSTRAINT "fk_project_associate"
          FOREIGN KEY("associate_id") 
          REFERENCES "associates"("id")
      );
    `);
    
    console.log("Tables créées avec succès");
    
    // Ajout des données de paramétrage
    console.log("Ajout des paramètres par défaut...");
    
    const settingsExists = await pool.query(`SELECT COUNT(*) FROM "settings"`);
    if (parseInt(settingsExists.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO "settings" ("key", "value", "category", "description")
        VALUES 
          ('aci_manager_weight', '1.5', 'distribution', 'Weight factor for managers in ACI distribution'),
          ('rcp_attendance_weight', '0.8', 'distribution', 'Weight factor for RCP meeting attendance in ACI distribution'),
          ('project_contribution_weight', '1.2', 'distribution', 'Weight factor for project contributions in ACI distribution')
      `);
    }
    
    // Ajout des données de démo
    console.log("Ajout des données de démo...");
    
    const associatesExists = await pool.query(`SELECT COUNT(*) FROM "associates"`);
    if (parseInt(associatesExists.rows[0].count) === 0) {
      // Associés
      await pool.query(`
        INSERT INTO "associates" ("name", "profession", "is_manager", "join_date", "patient_count", "participation_weight")
        VALUES 
          ('Dr. Rousseau', 'Médecin généraliste', true, '2020-01-01', 980, '1.5'),
          ('Dr. Martin', 'Médecin généraliste', false, '2020-03-15', 850, '1.0'),
          ('Mme. Dupont', 'Infirmière', false, '2021-06-01', 0, '1.0'),
          ('M. Bernard', 'Kinésithérapeute', true, '2022-01-15', 0, '1.3')
      `);
      
      // Revenus
      await pool.query(`
        INSERT INTO "revenues" ("source", "description", "amount", "date", "category")
        VALUES 
          ('CPAM', '1er versement ACI', '19125', '2024-01-15', 'ACI'),
          ('CPAM', '2ème versement ACI', '19125', '2024-04-15', 'ACI'),
          ('CPAM', '3ème versement ACI', '19125', '2024-07-15', 'ACI'),
          ('ARS', 'Subvention projet prévention', '7500', '2024-02-10', 'Subvention')
      `);
      
      // Dépenses
      await pool.query(`
        INSERT INTO "expenses" ("category", "description", "amount", "date", "is_recurring", "frequency")
        VALUES 
          ('Loyer', 'Loyer mensuel', '2500', '2024-01-01', true, 'monthly'),
          ('Électricité', 'Facture électricité', '350', '2024-01-15', true, 'monthly'),
          ('Matériel médical', 'Achat matériel de diagnostic', '1200', '2024-03-10', false, 'monthly'),
          ('Logiciel', 'Abonnement logiciel de gestion', '180', '2024-01-05', true, 'monthly')
      `);
      
      // Réunions RCP
      await pool.query(`
        INSERT INTO "rcp_meetings" ("date", "title", "description")
        VALUES 
          ('2024-01-10', 'RCP Mensuelle Janvier', 'Réunion mensuelle de coordination pluriprofessionnelle'),
          ('2024-02-14', 'RCP Mensuelle Février', 'Réunion mensuelle de coordination pluriprofessionnelle'),
          ('2024-03-13', 'RCP Mensuelle Mars', 'Réunion mensuelle de coordination pluriprofessionnelle')
      `);
      
      // Projets
      await pool.query(`
        INSERT INTO "projects" ("title", "description", "start_date", "end_date", "status", "weight")
        VALUES 
          ('Prévention Diabète', 'Projet de prévention du diabète pour les patients à risque', '2024-02-01', '2024-08-31', 'active', '1.5'),
          ('Téléconsultation', 'Mise en place d\'un système de téléconsultation', '2024-01-15', '2024-06-30', 'active', '1.2')
      `);
    }
    
    console.log("Base de données initialisée avec succès");
  } catch (error) {
    console.error("Erreur lors de l'initialisation :", error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

main().catch(error => {
  console.error("Erreur non interceptée :", error);
  process.exit(1);
});