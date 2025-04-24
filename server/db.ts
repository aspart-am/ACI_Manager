import pg from 'pg';
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Client PostgreSQL simple
export const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Se connecter au client dès l'importation du module
client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(e => console.error('Error connecting to PostgreSQL:', e));

// Fonction pour exécuter des requêtes SQL
export async function query(text: string, params?: any[]) {
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}