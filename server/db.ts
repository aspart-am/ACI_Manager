// Version pour le stockage JSON - Ne requiert pas PostgreSQL

// Fonction factice pour éviter de modifier trop de code existant
export async function query(text: string, params?: any[]) {
  console.log(`Mode JSON activé - Requête SQL ignorée: ${text}`);
  return {
    rows: [],
    rowCount: 0
  };
}

// Fonction pour la compatibilité avec le code existant
export const client = {
  connect: async () => {
    console.log('Mode stockage JSON activé - Pas de connexion PostgreSQL requise');
    return true;
  },
  query: query
};