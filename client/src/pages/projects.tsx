import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarRange, Users, CheckCircle, Briefcase } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { roundToTwoDecimals } from '@/lib/utils';

// Schéma de validation pour les projets
const projectFormSchema = z.object({
  title: z.string().min(3, { message: 'Le titre doit comporter au moins 3 caractères' }),
  description: z.string().optional(),
  startDate: z.string().min(1, { message: 'La date de début est requise' }),
  endDate: z.string().optional(),
  status: z.enum(['active', 'completed', 'pending'], {
    required_error: 'Veuillez sélectionner un statut',
  }),
  weight: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().min(0.1, { message: 'Le poids doit être supérieur à 0.1' })
  ),
});

// Schéma de validation pour les missions accessoires
const missionFormSchema = z.object({
  title: z.string().min(3, { message: 'Le titre doit comporter au moins 3 caractères' }),
  description: z.string().optional(),
  startDate: z.string().min(1, { message: 'La date de début est requise' }),
  endDate: z.string().optional(),
  status: z.enum(['active', 'completed', 'pending'], {
    required_error: 'Veuillez sélectionner un statut',
  }),
  type: z.string().min(1, { message: 'Le type de mission est requis' }),
  budget: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().min(0, { message: 'Le budget doit être positif ou nul' })
  ),
  year: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number().min(2000, { message: 'L\'année doit être valide' })
  ),
});

// Schéma de validation pour les affectations
const assignmentFormSchema = z.object({
  associateId: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number().min(1, { message: 'Veuillez sélectionner un associé' })
  ),
  contribution: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().min(0.1, { message: 'La contribution doit être supérieure à 0.1' })
  ),
});

// Schéma de validation pour les affectations aux missions
const missionAssignmentFormSchema = z.object({
  associateId: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number().min(1, { message: 'Veuillez sélectionner un associé' })
  ),
  contributionPercentage: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().min(1, { message: 'La contribution doit être au minimum de 1%' }).max(100, { message: 'La contribution ne peut pas dépasser 100%' })
  ),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;
type MissionFormValues = z.infer<typeof missionFormSchema>;
type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;
type MissionAssignmentFormValues = z.infer<typeof missionAssignmentFormSchema>;

// Composant principal
export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('projects');
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isMissionDialogOpen, setIsMissionDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isMissionAssignmentDialogOpen, setIsMissionAssignmentDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedMissionId, setSelectedMissionId] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  // Récupération des projets
  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    staleTime: 60000,
  }) as { data: any[], isLoading: boolean };

  // Récupération des missions accessoires
  const { data: missions = [], isLoading: isLoadingMissions } = useQuery({
    queryKey: ['/api/accessory-missions'],
    staleTime: 60000,
  }) as { data: any[], isLoading: boolean };

  // Récupération des associés
  const { data: associates = [] } = useQuery({
    queryKey: ['/api/associates'],
    staleTime: 60000,
  }) as { data: any[] };

  // Récupération des données pour un projet spécifique
  const { data: selectedProject, isLoading: isLoadingProjectDetails } = useQuery({
    queryKey: ['/api/projects', selectedProjectId],
    enabled: !!selectedProjectId,
  }) as { data: any, isLoading: boolean };

  // Récupération des données pour une mission spécifique
  const { data: selectedMission, isLoading: isLoadingMissionDetails } = useQuery({
    queryKey: ['/api/accessory-missions', selectedMissionId],
    enabled: !!selectedMissionId,
  }) as { data: any, isLoading: boolean };

  // Récupération des affectations pour un projet sélectionné
  const { data: projectAssignments = [], refetch: refetchProjectAssignments } = useQuery({
    queryKey: ['/api/projects', selectedProjectId, 'assignments'],
    enabled: !!selectedProjectId,
  }) as { data: any[], refetch: () => void };

  // Récupération des affectations pour une mission sélectionnée
  const { data: missionAssignments = [], refetch: refetchMissionAssignments } = useQuery({
    queryKey: ['/api/accessory-missions', selectedMissionId, 'assignments'],
    enabled: !!selectedMissionId,
  }) as { data: any[], refetch: () => void };

  // Formulaires
  const projectForm = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      weight: 1.0,
    },
  });

  const missionForm = useForm<MissionFormValues>({
    resolver: zodResolver(missionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      type: 'santé publique',
      budget: 0,
      year: currentYear,
    },
  });

  const assignmentForm = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      associateId: undefined,
      contribution: 1.0,
    },
  });

  const missionAssignmentForm = useForm<MissionAssignmentFormValues>({
    resolver: zodResolver(missionAssignmentFormSchema),
    defaultValues: {
      associateId: undefined,
      contributionPercentage: 100,
    },
  });

  // Mutations pour les projets
  const createProjectMutation = useMutation({
    mutationFn: (values: ProjectFormValues) => apiRequest('/api/projects', 'POST', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Projet créé',
        description: 'Le projet a été ajouté avec succès.',
      });
      projectForm.reset();
      setIsProjectDialogOpen(false);
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

  // Mutations pour les missions accessoires
  const createMissionMutation = useMutation({
    mutationFn: (values: MissionFormValues) => apiRequest('/api/accessory-missions', 'POST', values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accessory-missions'] });
      toast({
        title: 'Mission créée',
        description: 'La mission accessoire a été ajoutée avec succès.',
      });
      missionForm.reset();
      setIsMissionDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la mission accessoire.',
        variant: 'destructive',
      });
      console.error('Erreur lors de la création de la mission:', error);
    },
  });

  // Mutations pour les affectations de projets
  const createProjectAssignmentMutation = useMutation({
    mutationFn: (values: AssignmentFormValues) => 
      apiRequest('/api/project-assignments', 'POST', {
        ...values,
        projectId: selectedProjectId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectId, 'assignments'] });
      toast({
        title: 'Affectation ajoutée',
        description: 'L\'affectation a été ajoutée avec succès.',
      });
      assignmentForm.reset();
      setIsAssignmentDialogOpen(false);
      refetchProjectAssignments();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'affectation.',
        variant: 'destructive',
      });
      console.error('Erreur lors de l\'ajout de l\'affectation:', error);
    },
  });

  // Mutation pour les affectations de missions
  const createMissionAssignmentMutation = useMutation({
    mutationFn: (values: MissionAssignmentFormValues) => 
      apiRequest('/api/mission-assignments', 'POST', {
        ...values,
        missionId: selectedMissionId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accessory-missions', selectedMissionId, 'assignments'] });
      toast({
        title: 'Affectation ajoutée',
        description: 'L\'affectation a été ajoutée avec succès.',
      });
      missionAssignmentForm.reset();
      setIsMissionAssignmentDialogOpen(false);
      refetchMissionAssignments();
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'affectation.',
        variant: 'destructive',
      });
      console.error('Erreur lors de l\'ajout de l\'affectation:', error);
    },
  });

  // Soumission des formulaires
  function onSubmitProject(values: ProjectFormValues) {
    createProjectMutation.mutate(values);
  }

  function onSubmitMission(values: MissionFormValues) {
    createMissionMutation.mutate(values);
  }

  function onSubmitAssignment(values: AssignmentFormValues) {
    createProjectAssignmentMutation.mutate(values);
  }

  function onSubmitMissionAssignment(values: MissionAssignmentFormValues) {
    createMissionAssignmentMutation.mutate(values);
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

  // Fonction pour vérifier si un associé est déjà assigné à un projet
  const isAssociateAssignedToProject = (associateId: number) => {
    return projectAssignments.some((assignment: any) => assignment.associate_id === associateId);
  };

  // Fonction pour vérifier si un associé est déjà assigné à une mission
  const isAssociateAssignedToMission = (associateId: number) => {
    return missionAssignments.some((assignment: any) => assignment.associate_id === associateId);
  };

  // Fonction pour calculer la contribution totale d'un projet
  const calculateTotalContribution = (assignments: any[]) => {
    return assignments.reduce((total, assignment) => total + parseFloat(assignment.contribution || '0'), 0);
  };

  // Fonction pour calculer la contribution totale d'une mission
  const calculateTotalMissionContribution = (assignments: any[]) => {
    return assignments.reduce((total, assignment) => total + parseFloat(assignment.contribution_percentage || '0'), 0);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestion des projets et missions</h1>
      </div>

      <Tabs defaultValue="projects" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="projects" className="flex items-center">
            <Briefcase className="mr-2 h-4 w-4" />
            Projets
          </TabsTrigger>
          <TabsTrigger value="missions" className="flex items-center">
            <CalendarRange className="mr-2 h-4 w-4" />
            Missions accessoires
          </TabsTrigger>
        </TabsList>

        {/* Section des projets */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Projets</h2>
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
                                <FormField
                                  control={assignmentForm.control}
                                  name="contribution"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Contribution</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          min="0.1"
                                          placeholder="1.0"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter>
                                  <Button type="submit" disabled={createProjectAssignmentMutation.isPending}>
                                    {createProjectAssignmentMutation.isPending ? 'Ajout...' : 'Ajouter'}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Separator />
                      {projectAssignments.length === 0 ? (
                        <p>Aucun associé n'est impliqué dans ce projet.</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-2">
                            {projectAssignments.map((assignment: any) => {
                              const associate = associates.find((a: any) => a.id === assignment.associate_id);
                              return (
                                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-md">
                                  <div>
                                    <p className="font-medium">{associate?.name}</p>
                                    <p className="text-sm text-muted-foreground">{associate?.profession}</p>
                                  </div>
                                  <Badge variant="outline">
                                    Contribution: {assignment.contribution}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground">
                              Contribution totale: {roundToTwoDecimals(calculateTotalContribution(projectAssignments))}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Section des missions accessoires */}
        <TabsContent value="missions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Missions accessoires</h2>
            <Dialog open={isMissionDialogOpen} onOpenChange={setIsMissionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <CalendarRange className="mr-2 h-4 w-4" />
                  Nouvelle mission
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter une mission accessoire</DialogTitle>
                  <DialogDescription>
                    Créez une nouvelle mission accessoire pour votre MSP.
                  </DialogDescription>
                </DialogHeader>
                <Form {...missionForm}>
                  <form onSubmit={missionForm.handleSubmit(onSubmitMission)} className="space-y-4">
                    <FormField
                      control={missionForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titre</FormLabel>
                          <FormControl>
                            <Input placeholder="Titre de la mission" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={missionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Description de la mission" 
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
                        control={missionForm.control}
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
                        control={missionForm.control}
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
                        control={missionForm.control}
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
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="completed">Terminée</SelectItem>
                                <SelectItem value="pending">En attente</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={missionForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="santé publique">Santé publique</SelectItem>
                                <SelectItem value="crise sanitaire">Crise sanitaire</SelectItem>
                                <SelectItem value="coopération">Coopération</SelectItem>
                                <SelectItem value="innovation">Innovation</SelectItem>
                                <SelectItem value="formation">Formation</SelectItem>
                                <SelectItem value="autre">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={missionForm.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Budget (€)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="100"
                                min="0"
                                placeholder="0"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={missionForm.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Année</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="2000"
                                max="2100"
                                placeholder={currentYear.toString()}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={createMissionMutation.isPending}>
                        {createMissionMutation.isPending ? 'Création...' : 'Créer la mission'}
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
                  <CardTitle>Liste des missions</CardTitle>
                  <CardDescription>
                    Sélectionnez une mission pour gérer les affectations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingMissions ? (
                    <p>Chargement des missions...</p>
                  ) : missions.length === 0 ? (
                    <p>Aucune mission accessoire n'a été créée.</p>
                  ) : (
                    <ul className="space-y-2">
                      {missions.map((mission: any) => (
                        <li key={mission.id}>
                          <Button
                            variant={selectedMissionId === mission.id ? "default" : "outline"}
                            className="w-full justify-start"
                            onClick={() => setSelectedMissionId(mission.id)}
                          >
                            <div className="flex flex-col items-start">
                              <span className="font-medium">{mission.title}</span>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(mission.start_date)}
                              </span>
                              <div className="flex mt-1 space-x-2 flex-wrap">
                                <Badge variant={mission.status === 'active' ? 'default' : mission.status === 'completed' ? 'secondary' : 'outline'}>
                                  {mission.status === 'active' ? 'Active' : mission.status === 'completed' ? 'Terminée' : 'En attente'}
                                </Badge>
                                <Badge variant="outline">
                                  Budget: {mission.budget}€
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
                    {selectedMission ? (
                      <>
                        {selectedMission.title}
                      </>
                    ) : (
                      'Détails de la mission'
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedMission ? (
                      <>
                        <div className="flex flex-col space-y-1">
                          <span>Période: {formatDate(selectedMission.start_date)} {selectedMission.end_date ? `- ${formatDate(selectedMission.end_date)}` : '(en cours)'}</span>
                          <span>Type: {selectedMission.type}</span>
                          <span>Budget: {selectedMission.budget}€</span>
                          <span>Année: {selectedMission.year}</span>
                          <span>Statut: {selectedMission.status === 'active' ? 'Active' : selectedMission.status === 'completed' ? 'Terminée' : 'En attente'}</span>
                          {selectedMission.description && (
                            <p className="mt-2">{selectedMission.description}</p>
                          )}
                        </div>
                      </>
                    ) : (
                      'Sélectionnez une mission pour voir les détails'
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedMissionId ? (
                    <p>Veuillez sélectionner une mission dans la liste à gauche.</p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Associés impliqués</h3>
                        <Dialog open={isMissionAssignmentDialogOpen} onOpenChange={setIsMissionAssignmentDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">Ajouter un associé</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Ajouter un associé à la mission</DialogTitle>
                              <DialogDescription>
                                Définissez la contribution (en pourcentage) de l'associé à cette mission.
                              </DialogDescription>
                            </DialogHeader>
                            <Form {...missionAssignmentForm}>
                              <form onSubmit={missionAssignmentForm.handleSubmit(onSubmitMissionAssignment)} className="space-y-4">
                                <FormField
                                  control={missionAssignmentForm.control}
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
                                            .filter((a: any) => !isAssociateAssignedToMission(a.id))
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
                                <FormField
                                  control={missionAssignmentForm.control}
                                  name="contributionPercentage"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Contribution (%)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="1"
                                          min="1"
                                          max="100"
                                          placeholder="100"
                                          {...field}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <DialogFooter>
                                  <Button type="submit" disabled={createMissionAssignmentMutation.isPending}>
                                    {createMissionAssignmentMutation.isPending ? 'Ajout...' : 'Ajouter'}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <Separator />
                      {missionAssignments.length === 0 ? (
                        <p>Aucun associé n'est impliqué dans cette mission.</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-2">
                            {missionAssignments.map((assignment: any) => {
                              const associate = associates.find((a: any) => a.id === assignment.associate_id);
                              return (
                                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-md">
                                  <div>
                                    <p className="font-medium">{associate?.name}</p>
                                    <p className="text-sm text-muted-foreground">{associate?.profession}</p>
                                  </div>
                                  <Badge variant="outline">
                                    Contribution: {assignment.contribution_percentage}%
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground">
                              Contribution totale: {roundToTwoDecimals(calculateTotalMissionContribution(missionAssignments))}%
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}