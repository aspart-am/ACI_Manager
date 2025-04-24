import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './db';

// Fonction pour importer les associés depuis le fichier JSON
async function importAssociates() {
  try {
    // Lire le fichier JSON
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const filePath = path.join(__dirname, '../attached_assets/professionnels_sante.json');
    let fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Remplacer les valeurs NaN par null pour rendre le JSON valide
    fileContent = fileContent.replace(/: NaN/g, ': null');
    
    const professionals = JSON.parse(fileContent);

    console.log(`Chargement de ${professionals.length} professionnels depuis le fichier JSON...`);

    // Déterminer les cogérants (pour cet exemple, nous allons désigner les 3 premiers médecins comme cogérants)
    const medecins = professionals.filter(pro => pro.Profession === 'Médecin');
    const cogerants = medecins.slice(0, 3).map(med => med.Nom);

    console.log(`Les cogérants désignés sont: ${cogerants.join(', ')}`);

    // Importer chaque professionnel
    for (const professional of professionals) {
      const isManager = cogerants.includes(professional.Nom);
      const name = professional.Nom;
      const profession = professional.Profession;
      
      // Valeurs par défaut pour les champs manquants
      const joinDate = '2023-01-01'; // Date d'adhésion par défaut
      const patientCount = profession === 'Médecin' ? 800 : null; // Nombre de patients par défaut pour les médecins
      
      // Le poids de participation est plus élevé pour les cogérants
      const participationWeight = isManager ? '1.5' : '1.0';

      // Insérer le professionnel dans la base de données
      await query(
        'INSERT INTO associates(name, profession, is_manager, join_date, patient_count, participation_weight) VALUES($1, $2, $3, $4, $5, $6)',
        [
          name,
          profession,
          isManager,
          joinDate,
          patientCount,
          participationWeight
        ]
      );

      console.log(`Importé: ${name}, ${profession}, ${isManager ? 'Cogérant' : 'Associé'}`);
    }

    console.log('Importation des professionnels terminée avec succès');
    
    // Mettre à jour les paramètres de répartition selon les nouvelles règles
    await query("UPDATE settings SET value = '0.5' WHERE key = 'fixed_revenue_share'");
    await query("UPDATE settings SET value = '0.25' WHERE key = 'rcp_attendance_weight'");
    await query("UPDATE settings SET value = '0.25' WHERE key = 'project_contribution_weight'");
    
    // Créer de nouveaux paramètres s'ils n'existent pas
    const fixedShareExists = await query("SELECT id FROM settings WHERE key = 'fixed_revenue_share'");
    if (fixedShareExists.rows.length === 0) {
      await query(
        "INSERT INTO settings(key, value, category, description) VALUES('fixed_revenue_share', '0.5', 'distribution', 'Proportion des revenus fixes à redistribuer à parts égales')"
      );
    }
    
    const rcpShareExists = await query("SELECT id FROM settings WHERE key = 'rcp_share'");
    if (rcpShareExists.rows.length === 0) {
      await query(
        "INSERT INTO settings(key, value, category, description) VALUES('rcp_share', '0.25', 'distribution', 'Proportion proratisée aux temps de présence aux réunions')"
      );
    }
    
    const projectShareExists = await query("SELECT id FROM settings WHERE key = 'project_share'");
    if (projectShareExists.rows.length === 0) {
      await query(
        "INSERT INTO settings(key, value, category, description) VALUES('project_share', '0.25', 'distribution', 'Proportion à redistribuer aux associés ayant pris part à des missions')"
      );
    }
    
    console.log('Paramètres de répartition mis à jour');
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'importation des professionnels:', error);
    throw error;
  }
}

// Exécuter l'importation
importAssociates()
  .then(() => {
    console.log('Importation terminée');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur non interceptée:', error);
    process.exit(1);
  });