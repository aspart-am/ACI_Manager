import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Briefcase, 
  CalendarRange, 
  Check, 
  Clock, 
  Edit,
  FileText, 
  Info, 
  Loader2, 
  PlusCircle, 
  RefreshCw,
  Scale, 
  Trash2, 
  Users, 
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

// Type pour une affectation à un projet
type ProjectAssignment = {
  id: number;
  associateId: number;
  projectId: number;
  contribution: string;
  associateName?: string;
  associateProfession?: string;
  associateIsManager?: boolean;
};

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
  
  // Formulaire principal pour les projets
  const projectForm = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      status: 'active',
      weight: '1',
    },
  });
  
  // Formulaire pour les affectations
  const assignmentForm = useForm({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      projectId: '',
      associateId: '',
      contribution: '100',
    },
  });
  
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
  const selectedProject = selectedProjectId 
    ? projects.find((p: any) => p.id === selectedProjectId) 
    : null;
  
  // Mise à jour de la valeur par défaut du projectId dans le formulaire des affectations
  useEffect(() => {
    if (selectedProjectId) {
      assignmentForm.setValue('projectId', selectedProjectId.toString());
    }
  }, [selectedProjectId, assignmentForm]);
  
  // Mise à jour de la valeur de contribution lorsque autoDistribute change
  useEffect(() => {
    if (autoDistribute) {
      const equalShare = calculateEqualContribution(projectAssignments.length + 1);
      assignmentForm.setValue('contribution', equalShare.toString());
    }
  }, [autoDistribute, assignmentForm, projectAssignments.length]);
  
  // Initialiser le formulaire d'édition quand un projet est sélectionné
  const editForm = useForm({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'active',
      weight: '1',
    },
  });
  
  useEffect(() => {
    if (selectedProject) {
      editForm.reset({
        title: selectedProject.title || '',
        description: selectedProject.description || '',
        startDate: selectedProject.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        endDate: selectedProject.endDate?.split('T')[0] || '',
        status: selectedProject.status || 'active',
        weight: selectedProject.weight?.toString() || '1',
      });
    }
  }, [selectedProject, editForm]);
  
  // Fonction pour créer un nouveau projet
  const createProjectMutation = useMutation({
    mutationFn: (values: any) => {
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
      
      // Réinitialiser le formulaire
      projectForm.reset({
        title: '',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        status: 'active',
        weight: '1',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le projet.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour mettre à jour un projet
  const updateProjectMutation = useMutation({
    mutationFn: (values: any) => {
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
    onError: (error) => {
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
    onError: (error) => {
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
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le poids du projet.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour créer une affectation
  const createAssignmentMutation = useMutation({
    mutationFn: (values: any) => {
      return apiRequest('/api/project-assignments', 'POST', values);
    },
    onSuccess: (data) => {
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
      
      // Réinitialiser le formulaire
      assignmentForm.reset({
        projectId: selectedProjectId?.toString() || '',
        associateId: '',
        contribution: autoDistribute 
          ? calculateEqualContribution(projectAssignments.length + 1).toString()
          : '100',
      });
      
      toast({
        title: 'Associé ajouté',
        description: 'L\'associé a été ajouté au projet avec succès.',
      });
    },
    onError: (error) => {
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
    onError: (error) => {
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
  
  // Fonction pour redistribuer équitablement les contributions entre tous les associés assignés à un projet
  const redistributeContributions = async () => {
    if (!selectedProjectId || projectAssignments.length === 0) return;
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
      if (autoDistribute && projectAssignments.length > 1) {
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
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer l\'associé du projet.',
        variant: 'destructive',
      });
    },
  });
  
  // Fonction pour gérer la soumission du formulaire principal
  const onSubmitProject = (values: z.infer<typeof projectFormSchema>) => {
    createProjectMutation.mutate(values);
  };
  
  // Fonction pour gérer la soumission du formulaire d'affectation
  const onSubmitAssignment = (values: z.infer<typeof assignmentFormSchema>) => {
    setIsProcessingAssignment(true);
    createAssignmentMutation.mutate(values);
  };
  
  // Fonction pour vérifier si un associé est déjà assigné au projet
  const isAssociateAssignedToProject = (associateId: number): boolean => {
    return projectAssignments.some((assignment: any) => assignment.associateId === associateId);
  };
  
  // Fonction pour obtenir le nom de l'associé à partir de son ID
  const getAssociateName = (associateId: number): string => {
    const associate = associates.find((a: any) => a.id === associateId);
    return associate ? associate.name : `Associé ${associateId}`;
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

  // Calcul du total des contributions
  const totalContribution = projectAssignments.reduce((total: number, assignment: any) => {
    return total + parseFloat(assignment.contribution);
  }, 0);
  
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
            <Form {...projectForm}>
              <form onSubmit={projectForm.handleSubmit(onSubmitProject)} className="space-y-4">
                <FormField
                  control={projectForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom du projet" {...field} />
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
                <div className="grid grid-cols-2 gap-4">
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
                          <Input type="date" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                              <SelectValue placeholder="Statut du projet" />
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
        {/* Liste des projets */}
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
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : projectsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Erreur lors du chargement des projets
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => refetchProjects()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer
                  </Button>
                </div>
              ) : projects.length === 0 ? (
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
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(values => updateProjectMutation.mutate(values))} className="space-y-4">
                            <FormField
                              control={editForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Titre</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Nom du projet" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
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
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
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
                                control={editForm.control}
                                name="endDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Date de fin (optionnelle)</FormLabel>
                                    <FormControl>
                                      <Input type="date" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
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
                                          <SelectValue placeholder="Statut du projet" />
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
                                control={editForm.control}
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
                              <Button type="submit" disabled={updateProjectMutation.isPending}>
                                {updateProjectMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
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
                          {selectedProject.startDate && (
                            <span className="flex items-center text-muted-foreground">
                              <CalendarRange className="h-4 w-4 mr-1" />
                              {formatDate(selectedProject.startDate)}
                              {selectedProject.endDate && ` - ${formatDate(selectedProject.endDate)}`}
                            </span>
                          )}
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
                                          La contribution sera automatiquement calculée pour être équitable
                                          entre tous les associés.
                                        </p>
                                      )}
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <DialogFooter>
                                <Button type="submit" disabled={isProcessingAssignment}>
                                  {isProcessingAssignment ? 'Ajout en cours...' : 'Ajouter au projet'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <Separator className="mb-4" />
                  
                  {isLoadingAssignments ? (
                    <div className="py-8 space-y-4">
                      <div className="animate-pulse flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                      <p className="text-center text-sm text-muted-foreground">
                        Chargement des affectations...
                      </p>
                    </div>
                  ) : assignmentsError ? (
                    <div className="py-8 space-y-4">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                        <p className="font-medium text-red-600">Erreur de chargement</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Impossible de récupérer les affectations. Veuillez réessayer plus tard.
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => refetchAssignments()}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Réessayer
                        </Button>
                      </div>
                    </div>
                  ) : projectAssignments.length === 0 ? (
                    <div className="text-center p-8 bg-gray-50 rounded border">
                      <p>Aucun associé n'est affecté à ce projet.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Cliquez sur "Ajouter un associé" pour commencer.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!isBalanced && (
                        <Alert variant="destructive" className="mb-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Attention</AlertTitle>
                          <AlertDescription>
                            Le total des contributions n'est pas égal à 100% (actuel: {totalContribution.toFixed(1)}%).
                            Ajustez les contributions ou cliquez sur "Égaliser" pour une distribution automatique.
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {projectAssignments.map((assignment: ProjectAssignment) => {
                          const associate = associates.find((a: any) => a.id === assignment.associateId);
                          const associateName = associate ? associate.name : `Associé ${assignment.associateId}`;
                          const associateProfession = associate ? associate.profession : '';
                          const associateIsManager = associate ? associate.isManager : false;
                          
                          return (
                            <div 
                              key={assignment.id} 
                              className="flex p-4 rounded-lg border transition-colors hover:bg-gray-50"
                            >
                              <div className="w-3/5 pr-2">
                                <p className="font-medium">{associateName}</p>
                                <p className="text-sm text-muted-foreground">{associateProfession}</p>
                                {associateIsManager && (
                                  <Badge className="mt-1" variant="outline">Co-gérant</Badge>
                                )}
                              </div>
                              <div className="w-2/5 flex justify-end items-center gap-2">
                                <div className="flex-1">
                                  <Input
                                    type="number"
                                    min="0.1"
                                    max="100"
                                    step="0.1"
                                    value={assignment.contribution}
                                    onChange={(e) => handleContributionChange(assignment.id, e.target.value)}
                                    disabled={isProcessingAssignment}
                                    className="w-full text-right"
                                  />
                                </div>
                                <span className="text-sm font-medium">%</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteAssignment(assignment.id)}
                                  disabled={isProcessingAssignment}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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