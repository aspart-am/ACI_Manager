import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { testCreateRcpMeeting, testAddAssociateToProject, testAddAttendanceToRcp } from '../test_api';

export default function ApiTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runRcpTest = async () => {
    setIsLoading(true);
    setTestResults(prev => [...prev, 'Test de création de réunion RCP en cours...']);
    try {
      // Créer une réunion RCP avec une durée de 120 minutes (2 heures)
      const result = await testCreateRcpMeeting(120);
      setTestResults(prev => [...prev, `✅ Réunion RCP créée avec succès: ID=${result.id}, Durée=${result.duration} minutes`]);
      
      // Tester l'ajout d'une présence à cette réunion
      if (result.id) {
        setTestResults(prev => [...prev, 'Test d\'ajout de présence à la réunion en cours...']);
        const attendanceResult = await testAddAttendanceToRcp(result.id, 17); // ID 17 = premier associé
        setTestResults(prev => [...prev, `✅ Présence ajoutée avec succès: ID=${attendanceResult.id}`]);
      }
    } catch (error) {
      console.error('Erreur lors du test RCP:', error);
      setTestResults(prev => [...prev, `❌ Erreur lors de la création de réunion RCP: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const runProjectTest = async () => {
    setIsLoading(true);
    setTestResults(prev => [...prev, 'Test d\'ajout d\'associé à un projet en cours...']);
    try {
      // On suppose que le projet avec ID=1 existe
      const result = await testAddAssociateToProject(1, 17); // ID 17 = premier associé
      setTestResults(prev => [...prev, `✅ Associé ajouté au projet avec succès: ID=${result.id}`]);
    } catch (error) {
      console.error('Erreur lors du test Projet:', error);
      setTestResults(prev => [...prev, `❌ Erreur lors de l'ajout d'associé au projet: ${error}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Test d'API</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Test de réunion RCP</CardTitle>
            <CardDescription>Teste la création de réunion RCP et l'ajout de présence</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runRcpTest} disabled={isLoading}>
              {isLoading ? 'Test en cours...' : 'Exécuter le test RCP'}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test de projet</CardTitle>
            <CardDescription>Teste l'ajout d'un associé à un projet</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={runProjectTest} disabled={isLoading}>
              {isLoading ? 'Test en cours...' : 'Exécuter le test Projet'}
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Résultats des tests</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length === 0 ? (
            <p className="text-muted-foreground">Aucun test exécuté</p>
          ) : (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <p key={index}>{result}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}