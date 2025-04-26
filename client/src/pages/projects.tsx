import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Briefcase, 
  Scale, 
  Info, 
  PlusCircle, 
  Clock
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';

// Import des composants refactorisés
import { ProjectList } from '@/components/projects/project-list';
import { ProjectForm, ProjectFormValues } from '@/components/projects/project-form';
import { ProjectAssignmentForm, AssignmentFormValues } from '@/components/projects/project-assignment-form';
import { ProjectAssignmentsList } from '@/components/projects/project-assignments-list';

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // État des dialogues
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isWeightEditDialogOpen, setIsWeightEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  
  // État du formulaire d'édition du poids
  const [weightEditValue, setWeightEditValue] = useState('1');
  
  // État pour la distribution automatique des contributions
  const [autoDistribute, setAutoDistribute] = useState(true);
  
  // État pour les processus en cours
  const [isProcessingAssignment, setIsProcessingAssignment] = useState(false);
  
  // Requête pour obtenir tous les projets
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects,
    error: projectsError,
    refetch: refetchProjects
  } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 30000,
  });
  
  // Requête pour obtenir tous les associés
  const { 
    data: associates = [],
    isLoading: isLoadingAssociates 
  } = useQuery({
    queryKey: ['/api/associates'],
    staleTime: 60000,
  });
  
  // Requête pour obtenir les affectations du projet sélectionné
  const { 
    data: projectAssignments = [],
    isLoading: isLoadingAssignments,
    error: assignmentsError,
    refetch: refetchAssignments
  } = useQuery({
    queryKey: ['/api/projects', selectedProjectId, 'assignments'],
    enabled: !!selectedProjectId,
    staleTime: 0,
    refetchOnWindowFocus: true
  });
  
  // Projet sélectionné
  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);
  
  // Calculer la valeur de contribution par défaut lorsque autoDistribute change
  useEffect(() => {
    if (autoDistribute) {
      const equalShare = calculateEqualContribution(projectAssignments.length + 1);
      const assignmentFormDefaults = {
        projectId: selectedProjectId?.toString() || '',
        associateId: '',
        contribution: equalShare.toString(),
      };
    }
  }, [autoDistribute, projectAssignments.length, selectedProjectId]);
  
  // Fonction pour créer un nouveau projet
  const createProjectMutation = useMutation({
    mutationFn: (values: ProjectFormValues) => {
      return apiRequest('/api/projects', 'POST', values);
    },
    onSuccess: (data) => {
      setIsDialogOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      
      toast({
        title: 'Projet créé',
        description: 'Le projet a été créé avec succès.',
      });
      
      // Sélectionner automatiquement le nouveau projet créé
      setTimeout(() => {
        setSelectedProjectId(data.id);
      }, 300);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le projet.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour mettre à jour un projet
  const updateProjectMutation = useMutation({
    mutationFn: (values: ProjectFormValues) => {
      return apiRequest(`/api/projects/${selectedProjectId}`, 'PATCH', values);
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
      
      toast({
        title: 'Projet mis à jour',
        description: 'Le projet a été mis à jour avec succès.',
      });
      
      // Forcer un recalcul de la distribution
      setTimeout(() => {
        queryClient.fetchQuery({ queryKey: ['/api/distribution/calculation'] });
      }, 300);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le projet.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour supprimer un projet
  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/projects/${id}`, 'DELETE');
    },
    onSuccess: () => {
      // Invalider les requêtes liées aux projets et à la distribution
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
      
      toast({
        title: 'Projet supprimé',
        description: 'Le projet a été supprimé avec succès.',
      });
      
      // Réinitialiser la sélection
      setSelectedProjectId(null);
      
      // Forcer un recalcul de la distribution
      setTimeout(() => {
        queryClient.fetchQuery({ queryKey: ['/api/distribution/calculation'] });
      }, 300);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le projet.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour mettre à jour le poids d'un projet
  const updateWeightMutation = useMutation({
    mutationFn: (weight: string) => {
      return apiRequest(`/api/projects/${selectedProjectId}`, 'PATCH', { weight });
    },
    onSuccess: () => {
      setIsWeightEditDialogOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
      
      toast({
        title: 'Poids mis à jour',
        description: 'Le poids du projet a été mis à jour avec succès.',
      });
      
      // Forcer un recalcul de la distribution
      setTimeout(() => {
        queryClient.fetchQuery({ queryKey: ['/api/distribution/calculation'] });
      }, 300);
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le poids du projet.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour créer une affectation
  const createAssignmentMutation = useMutation({
    mutationFn: (values: AssignmentFormValues) => {
      return apiRequest('/api/project-assignments', 'POST', values);
    },
    onSuccess: () => {
      setIsAssignDialogOpen(false);
      setIsProcessingAssignment(false);
      
      // Si autoDistribute est activé, redistribuer les contributions 
      if (autoDistribute) {
        redistributeContributions();
      } else {
        // Sinon, simplement invalider les requêtes
        queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectId, 'assignments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
        
        // Forcer un recalcul de la distribution
        setTimeout(() => {
          queryClient.fetchQuery({ queryKey: ['/api/distribution/calculation'] });
        }, 300);
      }
      
      toast({
        title: 'Associé ajouté',
        description: 'L\'associé a été ajouté au projet avec succès.',
      });
    },
    onError: () => {
      setIsProcessingAssignment(false);
      
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'associé au projet.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour mettre à jour une affectation
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, contribution }: { id: number, contribution: number }) => {
      return apiRequest(`/api/project-assignments/${id}`, 'PATCH', { contribution });
    },
    onSuccess: () => {
      setIsProcessingAssignment(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
      
      // Forcer un recalcul de la distribution
      setTimeout(() => {
        queryClient.fetchQuery({ queryKey: ['/api/distribution/calculation'] });
      }, 300);
    },
    onError: () => {
      setIsProcessingAssignment(false);
      
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la contribution.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour calculer une contribution égale
  const calculateEqualContribution = (count: number): number => {
    if (count <= 0) return 100;
    return parseFloat((100 / count).toFixed(1));
  };
  
  // Fonction pour redistribuer équitablement les contributions
  const redistributeContributions = async () => {
    if (!selectedProjectId || !Array.isArray(projectAssignments) || projectAssignments.length === 0) return;
    setIsProcessingAssignment(true);
    
    try {
      const equalShare = calculateEqualContribution(projectAssignments.length);
      
      // Mettre à jour chaque affectation avec la nouvelle contribution
      const updatePromises = projectAssignments.map((assignment: any) => 
        updateAssignmentMutation.mutateAsync({ id: assignment.id, contribution: equalShare })
      );
      
      // Attendre que toutes les mises à jour soient terminées
      await Promise.all(updatePromises);
      
      toast({
        title: 'Contributions redistribuées',
        description: 'Les contributions ont été redistribuées équitablement entre tous les associés.',
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de redistribuer les contributions.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingAssignment(false);
    }
  };
  
  // Fonction pour supprimer une affectation
  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/project-assignments/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectId, 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
      
      toast({
        title: 'Associé retiré',
        description: 'L\'associé a été retiré du projet avec succès.',
      });
      
      // Si autoDistribute est activé, redistribuer les contributions
      if (autoDistribute && Array.isArray(projectAssignments) && projectAssignments.length > 1) {
        setTimeout(() => {
          redistributeContributions();
        }, 300);
      } else {
        // Forcer un recalcul de la distribution
        setTimeout(() => {
          queryClient.fetchQuery({ queryKey: ['/api/distribution/calculation'] });
        }, 300);
      }
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer l\'associé du projet.',
        variant: 'destructive',
      });
    },
  });

  // Valeurs initiales pour le formulaire d'affectation
  const assignmentFormValues: AssignmentFormValues = {
    projectId: selectedProjectId?.toString() || '',
    associateId: '',
    contribution: autoDistribute 
      ? calculateEqualContribution(Array.isArray(projectAssignments) ? projectAssignments.length + 1 : 1).toString()
      : '100',
  };
  
  // Fonction pour vérifier si un associé est déjà assigné au projet
  const isAssociateAssignedToProject = (associateId: number): boolean => {
    if (!Array.isArray(projectAssignments)) return false;
    return projectAssignments.some((assignment: any) => assignment.associateId === associateId);
  };
  
  // Fonction pour modifier la contribution d'un associé
  const handleContributionChange = (assignmentId: number, value: string) => {
    if (isProcessingAssignment) return;
    
    const contribution = parseFloat(value);
    if (isNaN(contribution) || contribution <= 0 || contribution > 100) return;
    
    setIsProcessingAssignment(true);
    updateAssignmentMutation.mutate({ id: assignmentId, contribution });
  };
  
  // Fonction pour supprimer une affectation
  const handleDeleteAssignment = (assignmentId: number) => {
    if (isProcessingAssignment) return;
    
    deleteAssignmentMutation.mutate(assignmentId);
  };
  
  // Fonction pour confirmer la suppression d'un projet
  const handleDeleteProject = () => {
    if (!selectedProjectId) return;
    
    deleteProjectMutation.mutate(selectedProjectId);
    setIsDeleteDialogOpen(false);
  };
  
  // Fonction pour mettre à jour le poids d'un projet
  const handleWeightUpdate = () => {
    if (!selectedProjectId || !weightEditValue) return;
    
    const weight = parseFloat(weightEditValue);
    if (isNaN(weight) || weight <= 0) {
      toast({
        title: 'Erreur',
        description: 'Le poids doit être un nombre positif.',
        variant: 'destructive',
      });
      return;
    }
    
    updateWeightMutation.mutate(weightEditValue);
  };

  // Calcul du total des contributions
  const totalContribution = Array.isArray(projectAssignments) 
    ? projectAssignments.reduce((total: number, assignment: any) => {
        return total + parseFloat(assignment.contribution);
      }, 0)
    : 0;
  
  // État de l'équilibre des contributions
  const isBalanced = Math.abs(totalContribution - 100) < 0.1;

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Projets et Missions</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Briefcase className="mr-2 h-4 w-4" />
              Nouveau projet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un projet</DialogTitle>
              <DialogDescription>
                Créez un nouveau projet ou une mission pour la MSP.
              </DialogDescription>
            </DialogHeader>
            <ProjectForm 
              onSubmit={createProjectMutation.mutate} 
              isSubmitting={createProjectMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Liste des projets */}
        <div className="md:col-span-4 space-y-4">
          <ProjectList 
            projects={projects}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            isLoading={isLoadingProjects}
            error={projectsError}
            refetch={refetchProjects}
          />
        </div>

        {/* Détails du projet sélectionné */}
        <div className="md:col-span-8">
          {selectedProjectId && selectedProject ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedProject.title}</CardTitle>
                    <CardDescription>
                      Gestion des affectations et contributions
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Modifier
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Modifier le projet</DialogTitle>
                          <DialogDescription>
                            Modifiez les informations de ce projet.
                          </DialogDescription>
                        </DialogHeader>
                        <ProjectForm 
                          defaultValues={{
                            title: selectedProject.title || '',
                            description: selectedProject.description || '',
                            startDate: selectedProject.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
                            endDate: selectedProject.endDate?.split('T')[0] || '',
                            status: selectedProject.status || 'active',
                            weight: selectedProject.weight?.toString() || '1',
                          }}
                          onSubmit={updateProjectMutation.mutate}
                          isSubmitting={updateProjectMutation.isPending}
                          submitLabel="Mettre à jour"
                        />
                      </DialogContent>
                    </Dialog>
                    
                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible
                            et supprimera également toutes les affectations associées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-500 hover:bg-red-600"
                            onClick={handleDeleteProject}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informations détaillées du projet */}
                <div>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">Détails du projet</h3>
                      <div className="mt-2 space-y-1 text-sm">
                        {selectedProject.description && (
                          <p className="text-muted-foreground">{selectedProject.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                          <span className="flex items-center">
                            <Scale className="h-4 w-4 mr-1" />
                            Poids: {selectedProject.weight || 1}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-auto"
                            onClick={() => {
                              setWeightEditValue(selectedProject.weight?.toString() || '1');
                              setIsWeightEditDialogOpen(true);
                            }}
                          >
                            <Scale className="h-3 w-3 mr-1" />
                            Modifier le poids
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Explication pour l'utilisateur */}
                  <Alert className="my-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Gestion des contributions</AlertTitle>
                    <AlertDescription>
                      Ajoutez des associés au projet et définissez leur pourcentage de contribution.
                      Le poids du projet influence l'impact de ces contributions sur la répartition des revenus.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-between items-center mt-6 mb-3">
                    <h3 className="text-lg font-medium flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Associés affectés au projet
                    </h3>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isProcessingAssignment}
                        onClick={() => redistributeContributions()}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Égaliser
                      </Button>
                      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Ajouter un associé
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Ajouter un associé au projet</DialogTitle>
                            <DialogDescription>
                              Sélectionnez un associé et définissez sa contribution au projet.
                            </DialogDescription>
                          </DialogHeader>
                          <ProjectAssignmentForm 
                            defaultValues={assignmentFormValues}
                            onSubmit={createAssignmentMutation.mutate}
                            isSubmitting={isProcessingAssignment}
                            autoDistribute={autoDistribute}
                            setAutoDistribute={setAutoDistribute}
                            associates={associates}
                            isAssociateAssignedToProject={isAssociateAssignedToProject}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <Separator className="mb-4" />
                  
                  <ProjectAssignmentsList 
                    assignments={projectAssignments}
                    associates={associates}
                    isLoading={isLoadingAssignments}
                    error={assignmentsError}
                    refetch={refetchAssignments}
                    totalContribution={totalContribution}
                    isBalanced={isBalanced}
                    onContributionChange={handleContributionChange}
                    onDeleteAssignment={handleDeleteAssignment}
                    isProcessing={isProcessingAssignment}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto text-gray-200 mb-4" />
                <h3 className="text-xl font-medium mb-2">Aucun projet sélectionné</h3>
                <p className="text-muted-foreground max-w-md">
                  Veuillez sélectionner un projet dans la liste ou créer un nouveau projet
                  pour gérer les affectations.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Dialogue pour modifier le poids */}
      <Dialog open={isWeightEditDialogOpen} onOpenChange={setIsWeightEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le poids du projet</DialogTitle>
            <DialogDescription>
              Le poids influence l'impact de ce projet dans la répartition des revenus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Poids</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weightEditValue}
                  onChange={(e) => setWeightEditValue(e.target.value)}
                  className="flex-1"
                />
                <Scale className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Un poids plus élevé donnera plus d'importance à ce projet dans la distribution des revenus.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWeightEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleWeightUpdate} disabled={updateWeightMutation.isPending}>
              {updateWeightMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}