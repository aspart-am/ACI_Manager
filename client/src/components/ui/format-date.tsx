import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Utilitaire pour formater les dates de manière consistante dans l'application
 */
export function formatDate(dateString: string, formatString: string = 'dd MMMM yyyy'): string {
  if (!dateString) return '';
  
  try {
    const date = dateString.includes('T') 
      ? parseISO(dateString) 
      : new Date(dateString);
    return format(date, formatString, { locale: fr });
  } catch (e) {
    console.error('Erreur lors du formatage de la date:', e);
    return dateString;
  }
}