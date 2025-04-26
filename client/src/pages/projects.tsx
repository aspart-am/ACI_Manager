import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Briefcase, Pencil, Trash2, Calculator } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';

// Schéma de validation pour le formulaire des projets
const projectFormSchema = z.object({
  title: z.string().min(3, { message: 'Le titre doit comporter au moins 3 caractères' }),
  description: z.string().optional(),
  startDate: z.string().min(1, { message: 'La date de début est requise' }),
  endDate: z.string().optional(),
  status: z.string().min(1, { message: 'Le statut est requis' }),
  weight: z.string().min(1, { message: 'Le poids est requis' }),
});

// Schéma de validation pour le formulaire d'affectation à un projet
const assignmentFormSchema = z.object({
  projectId: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number().min(1)
  ),
  associateId: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number().min(1, { message: 'Veuillez sélectionner un associé' })
  ),
  contribution: z.string().min(1, { message: 'La contribution est requise' }),
});

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // État pour les dialogues
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);

  // État pour les sélections
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [autoDistribute, setAutoDistribute] = useState(true);

  // Formulaires
  const projectForm = useForm<z.infer<typeof projectFormSchema>>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'active',
      weight: '1', // Convertir en chaîne pour correspondre au schéma
    },
  });

  const assignmentForm = useForm<z.infer<typeof assignmentFormSchema>>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      projectId: selectedProjectId || undefined,
      associateId: undefined,
      contribution: '10', // Convertir en chaîne pour correspondre au schéma
    },
  });

  // Mise à jour des valeurs par défaut lorsque le projet sélectionné change
  useEffect(() => {
    if (selectedProjectId) {
      assignmentForm.setValue('projectId', selectedProjectId);
    }
  }, [assignmentForm, selectedProjectId]);

  // Requêtes pour récupérer les données
  const { data: associates = [], isLoading: isLoadingAssociates } = useQuery({
    queryKey: ['/api/associates'],
    select: (data) => data || [],
  });

  const { data: projects = [], isLoading: isLoadingProjects, refetch: refetchProjects } = useQuery({
    queryKey: ['/api/projects'],
    select: (data) => data || [],
  });

  // Récupération du projet sélectionné
  const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

  // Récupération des affectations pour le projet sélectionné
  const { data: projectAssignments = [], refetch: refetchProjectAssignments } = useQuery({
    queryKey: ['/api/projects', selectedProjectId, 'assignments'],
    enabled: !!selectedProjectId,
    queryFn: () => apiRequest(`/api/projects/${selectedProjectId}/assignments`, 'GET'),
    select: (data) => data || [],
  });

  // Mutations
  const createProjectMutation = useMutation({
    mutationFn: (values: z.infer<typeof projectFormSchema>) => apiRequest('/api/projects', 'POST', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Projet créé',
        description: 'Le projet a été ajouté avec succès.',
      });
      projectForm.reset();
      setIsProjectDialogOpen(false);
      refetchProjects();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le projet.',
        variant: 'destructive',
      });
      console.error('Erreur lors de la création du projet:', error);
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (values: z.infer<typeof assignmentFormSchema>) => 
      apiRequest('/api/project-assignments', 'POST', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectId, 'assignments'] });
      toast({
        title: 'Affectation créée',
        description: 'L\'associé a été affecté au projet avec succès.',
      });
      assignmentForm.reset({
        projectId: selectedProjectId || undefined,
        associateId: undefined,
        contribution: '10',
      });
      setIsAssignmentDialogOpen(false);
      refetchProjectAssignments();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'affectation.',
        variant: 'destructive',
      });
      console.error('Erreur lors de la création de l\'affectation:', error);
    },
  });

  // Fonctions pour gérer les soumissions de formulaire
  function onSubmitProject(values: z.infer<typeof projectFormSchema>) {
    createProjectMutation.mutate(values);
  }

  function onSubmitAssignment(values: z.infer<typeof assignmentFormSchema>) {
    // S'assurer que le projectId est défini
    const formData = {
      ...values,
      projectId: selectedProjectId || values.projectId,
    };
    createAssignmentMutation.mutate(formData);
  }

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (e) {
      return dateString;
    }
  };

  // Fonction pour vérifier si un associé est déjà assigné au projet
  const isAssociateAssignedToProject = (associateId: number) => {
    return projectAssignments.some((a: any) => a.associateId === associateId);
  };

  // Fonction pour arrondir à 2 décimales
  const roundToTwoDecimals = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  // Fonction pour calculer la contribution totale d'un projet
  const calculateTotalContribution = (assignments: any[]) => {
    return assignments.reduce((total, assignment) => total + parseFloat(assignment.contribution || '0'), 0);
  };
  
  // Fonction pour calculer la contribution égale par associé
  const calculateEqualContribution = (totalAssociates: number) => {
    if (totalAssociates <= 0) return '0';
    // Répartir 100% de contribution également entre tous les associés
    const equalShare = 100 / totalAssociates;
    return roundToTwoDecimals(equalShare).toString();
  };
  
  // Effet pour mettre à jour automatiquement la contribution si l'option est activée
  useEffect(() => {
    if (autoDistribute && selectedProjectId) {
      const equalShare = calculateEqualContribution(projectAssignments.length + 1);
      assignmentForm.setValue('contribution', equalShare);
    }
  }, [autoDistribute, assignmentForm, projectAssignments.length, selectedProjectId]);
  
  // Fonction pour redistribuer équitablement les contributions entre tous les associés assignés à un projet
  const redistributeContributions = async () => {
    if (!selectedProjectId || projectAssignments.length === 0) return;
    
    try {
      const equalShare = calculateEqualContribution(projectAssignments.length);
      
      // Mettre à jour chaque affectation avec la nouvelle contribution
      const updatePromises = projectAssignments.map(assignment => 
        apiRequest(`/api/project-assignments/${assignment.id}`, 'PATCH', {
          contribution: equalShare
        })
      );
      
      // Attendre que toutes les mises à jour soient terminées
      await Promise.all(updatePromises);
      
      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectId, 'assignments'] });
      
      // Ajouter un délai avant de rafraîchir pour s'assurer que le cache est invalidé
      setTimeout(() => {
        refetchProjectAssignments();
        
        toast({
          title: 'Contributions redistribuées',
          description: `Chaque associé a maintenant une contribution de ${equalShare}%.`,
        });
      }, 300);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de redistribuer les contributions.',
        variant: 'destructive',
      });
      console.error('Erreur lors de la redistribution des contributions:', error);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des projets</h1>
        <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
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
                Créez un nouveau projet pour votre MSP.
              </DialogDescription>
            </DialogHeader>
            <Form {...projectForm}>
              <form onSubmit={projectForm.handleSubmit(onSubmitProject)} className="space-y-4">
                <FormField
                  control={projectForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl>
                        <Input placeholder="Titre du projet" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={projectForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Description du projet" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={projectForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de début</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={projectForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date de fin (optionnelle)</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={projectForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Statut</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un statut" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Actif</SelectItem>
                            <SelectItem value="completed">Terminé</SelectItem>
                            <SelectItem value="pending">En attente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={projectForm.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Poids</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            min="0.1" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? 'Création...' : 'Créer le projet'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Liste des projets</CardTitle>
              <CardDescription>
                Sélectionnez un projet pour gérer les affectations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProjects ? (
                <p>Chargement des projets...</p>
              ) : projects.length === 0 ? (
                <p>Aucun projet n'a été créé.</p>
              ) : (
                <ul className="space-y-2">
                  {projects.map((project: any) => (
                    <li key={project.id}>
                      <Button
                        variant={selectedProjectId === project.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedProjectId(project.id)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{project.title}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(project.start_date)}
                          </span>
                          <div className="flex mt-1 space-x-2">
                            <Badge variant={project.status === 'active' ? 'default' : project.status === 'completed' ? 'secondary' : 'outline'}>
                              {project.status === 'active' ? 'Actif' : project.status === 'completed' ? 'Terminé' : 'En attente'}
                            </Badge>
                            <Badge variant="outline">
                              Poids: {project.weight}
                            </Badge>
                            <Badge variant="secondary">
                              {project.assignmentCount || 0} associés
                            </Badge>
                          </div>
                        </div>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedProject ? (
                  <>
                    {selectedProject.title}
                  </>
                ) : (
                  'Détails du projet'
                )}
              </CardTitle>
              <CardDescription>
                {selectedProject ? (
                  <>
                    <div className="flex flex-col space-y-1">
                      <span>Période: {formatDate(selectedProject.start_date)} {selectedProject.end_date ? `- ${formatDate(selectedProject.end_date)}` : '(en cours)'}</span>
                      <span>Statut: {selectedProject.status === 'active' ? 'Actif' : selectedProject.status === 'completed' ? 'Terminé' : 'En attente'}</span>
                      <span>Poids: {selectedProject.weight}</span>
                      {selectedProject.description && (
                        <p className="mt-2">{selectedProject.description}</p>
                      )}
                    </div>
                  </>
                ) : (
                  'Sélectionnez un projet pour voir les détails'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedProjectId ? (
                <p>Veuillez sélectionner un projet dans la liste à gauche.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Associés impliqués</h3>
                    <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">Ajouter un associé</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ajouter un associé au projet</DialogTitle>
                          <DialogDescription>
                            Associez un professionnel de santé à ce projet.
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...assignmentForm}>
                          <form onSubmit={assignmentForm.handleSubmit(onSubmitAssignment)} className="space-y-4">
                            <FormField
                              control={assignmentForm.control}
                              name="associateId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Associé</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value?.toString()}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Sélectionner un associé" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {associates
                                        .filter((a: any) => !isAssociateAssignedToProject(a.id))
                                        .map((associate: any) => (
                                          <SelectItem key={associate.id} value={associate.id.toString()}>
                                            {associate.name} ({associate.profession})
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="space-y-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="auto-distribute"
                                  checked={autoDistribute}
                                  onCheckedChange={setAutoDistribute}
                                />
                                <Label htmlFor="auto-distribute">
                                  Distribution automatique des contributions
                                </Label>
                              </div>
                              
                              <FormField
                                control={assignmentForm.control}
                                name="contribution"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Contribution (%)</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.1" 
                                        min="0.1" 
                                        max="100"
                                        {...field}
                                        disabled={autoDistribute}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                    {autoDistribute && (
                                      <p className="text-sm text-muted-foreground">
                                        La contribution sera automatiquement calculée pour être répartie équitablement.
                                      </p>
                                    )}
                                  </FormItem>
                                )}
                              />
                            </div>
                            <DialogFooter>
                              <Button type="submit" disabled={createAssignmentMutation.isPending}>
                                {createAssignmentMutation.isPending ? 'Ajout...' : 'Ajouter l\'associé'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {projectAssignments.length === 0 ? (
                    <p>Aucun associé n'est impliqué dans ce projet.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {projectAssignments.map((assignment: any) => {
                          const associate = associates.find((a: any) => a.id === assignment.associateId);
                          return (
                            <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-md">
                              <div>
                                <p className="font-medium">{associate?.name}</p>
                                <p className="text-sm text-muted-foreground">{associate?.profession}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  className="w-20"
                                  min="0.1"
                                  max="100"
                                  step="0.1"
                                  value={assignment.contribution}
                                  onChange={async (e) => {
                                    const newValue = e.target.value;
                                    try {
                                      await apiRequest(`/api/project-assignments/${assignment.id}`, 'PATCH', {
                                        contribution: newValue
                                      });
                                      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectId, 'assignments'] });
                                      refetchProjectAssignments();
                                      toast({
                                        title: 'Contribution mise à jour',
                                        description: `La contribution a été modifiée avec succès.`,
                                      });
                                    } catch (error) {
                                      toast({
                                        title: 'Erreur',
                                        description: 'Impossible de modifier la contribution.',
                                        variant: 'destructive',
                                      });
                                      console.error('Erreur lors de la modification de la contribution:', error);
                                    }
                                  }}
                                />
                                <span>%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Contribution totale: {roundToTwoDecimals(calculateTotalContribution(projectAssignments))}%
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={redistributeContributions}
                          title="Redistribuer les contributions équitablement entre tous les associés"
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Redistribuer équitablement
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}