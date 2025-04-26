import React from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarRange, Scale, Users, Loader2, RefreshCw, Briefcase, AlertCircle } from 'lucide-react';

interface ProjectListProps {
  projects: any[];
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number) => void;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function ProjectList({ 
  projects, 
  selectedProjectId, 
  setSelectedProjectId, 
  isLoading, 
  error, 
  refetch 
}: ProjectListProps) {
  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = dateString.includes('T') 
        ? parseISO(dateString) 
        : new Date(dateString);
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Liste des projets</CardTitle>
        <CardDescription>
          Sélectionnez un projet pour gérer les affectations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Erreur lors du chargement des projets
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </div>
        ) : !Array.isArray(projects) || projects.length === 0 ? (
          <div className="text-center py-8 space-y-3">
            <Briefcase className="w-12 h-12 mx-auto text-gray-300" />
            <p>Aucun projet trouvé</p>
            <p className="text-sm text-muted-foreground">
              Cliquez sur "Nouveau projet" pour commencer
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project: any) => (
              <div 
                key={project.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedProjectId === project.id 
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedProjectId(project.id)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium">{project.title}</h3>
                  <div className="flex space-x-1">
                    {project.status === 'active' && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Actif</Badge>
                    )}
                    {project.status === 'pending' && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200">En attente</Badge>
                    )}
                    {project.status === 'completed' && (
                      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200">Terminé</Badge>
                    )}
                    {project.assignmentCount > 0 && (
                      <Badge variant="outline" className="ml-1">
                        <Users className="h-3 w-3 mr-1" />
                        {project.assignmentCount}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                  {project.startDate && (
                    <span className="flex items-center">
                      <CalendarRange className="h-3 w-3 mr-1" />
                      {formatDate(project.startDate)}
                    </span>
                  )}
                  <span className="flex items-center">
                    <Scale className="h-3 w-3 mr-1" />
                    Poids: {project.weight || 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}