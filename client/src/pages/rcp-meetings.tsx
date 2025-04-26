import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Pencil, Trash2, Check, X, Clock, Users, Info, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Schéma de validation du formulaire
const formSchema = z.object({
  date: z.string().min(1, { message: 'La date est requise' }),
  title: z.string().min(3, { message: 'Le titre doit comporter au moins 3 caractères' }),
  description: z.string().optional(),
  duration: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number().min(15, { message: 'La durée minimale est de 15 minutes' })
  ),
});

type FormValues = z.infer<typeof formSchema>;

// Composant principal
export default function RcpMeetings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);

  // Récupération des réunions RCP
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['/api/rcp-meetings'],
    staleTime: 60000,
  }) as { data: any[], isLoading: boolean };

  // Récupération des associés
  const { data: associates = [] } = useQuery({
    queryKey: ['/api/associates'],
    staleTime: 60000,
  }) as { data: any[] };

  // Récupération des présences pour la réunion sélectionnée
  const { 
    data: attendances = [], 
    refetch: refetchAttendances, 
    isLoading: isLoadingAttendances,
    error: attendancesError
  } = useQuery({
    queryKey: ['/api/rcp-meetings', selectedMeetingId, 'attendances'],
    enabled: !!selectedMeetingId,
    // Activer le refetch automatique et réduire le staleTime pour plus de synchronisation
    staleTime: 0, // Réduire staleTime à 0 pour forcer la validation des données
    refetchInterval: 5000, // Réduire l'intervalle de rafraichissement
    refetchOnWindowFocus: true, // Rafraichir quand la fenêtre reprend le focus
    retry: 3, // Réessayer 3 fois en cas d'échec
  }) as { 
    data: any[], 
    refetch: () => void, 
    isLoading: boolean,
    error: any 
  };
  
  // Log des présences et des erreurs pour débogage
  React.useEffect(() => {
    if (attendances && Array.isArray(attendances)) {
      console.log("Présences récupérées:", meetings.filter(m => m.id === selectedMeetingId), attendances);
    }
    if (attendancesError) {
      console.error("Erreur lors du chargement des présences:", attendancesError);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de charger les données de présences. Veuillez réessayer.",
        variant: "destructive",
      });
    }
  }, [attendances, attendancesError, meetings, selectedMeetingId, toast]);
  
  // Effet pour refetch les présences quand on change de réunion sélectionnée
  React.useEffect(() => {
    if (selectedMeetingId) {
      refetchAttendances();
    }
  }, [selectedMeetingId, refetchAttendances]);

  // Récupération des données pour une réunion spécifique
  const selectedMeeting = React.useMemo(() => {
    if (!selectedMeetingId || !meetings || !Array.isArray(meetings)) return null;
    return meetings.find((meeting: any) => meeting.id === selectedMeetingId);
  }, [selectedMeetingId, meetings]);
  
  // État pour l'édition de réunion
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Formulaire d'édition
  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: '',
      title: '',
      description: '',
      duration: 60,
    },
  });
  
  // Initialiser le formulaire d'édition quand une réunion est sélectionnée
  React.useEffect(() => {
    if (selectedMeeting) {
      // Log pour débogage
      console.log("Initialisation du formulaire d'édition avec:", selectedMeeting);
      
      editForm.reset({
        date: selectedMeeting.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        title: selectedMeeting.title || '',
        description: selectedMeeting.description || '',
        duration: selectedMeeting.duration || 60,
      });
      
      // Refetch explicite des présences quand une réunion est sélectionnée
      refetchAttendances();
    }
  }, [selectedMeeting, editForm, refetchAttendances]);
  
  // Mutation pour modifier une réunion
  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      const durationValue = typeof values.duration === 'string' 
        ? parseInt(values.duration, 10) 
        : values.duration;
        
      return apiRequest(`/api/rcp-meetings/${selectedMeetingId}`, 'PATCH', {
        ...values,
        duration: durationValue
      });
    },
    onSuccess: () => {
      // Invalider toutes les requêtes liées aux réunions
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings', selectedMeetingId] });
      
      // Invalider également les présences pour mettre à jour le panneau des participants
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings', selectedMeetingId, 'attendances'] });
      
      // Invalider le calcul de distribution qui dépend des réunions
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
      
      // Refetch explicite des données après mise à jour
      setTimeout(() => {
        refetchAttendances();
      }, 300);
      
      toast({
        title: 'Réunion mise à jour',
        description: 'La réunion RCP a été modifiée avec succès.',
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la réunion RCP.',
        variant: 'destructive',
      });
      console.error('Erreur lors de la modification de la réunion:', error);
    },
  });
  
  // Mutation pour supprimer une réunion
  const deleteMutation = useMutation({
    mutationFn: () => apiRequest(`/api/rcp-meetings/${selectedMeetingId}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      toast({
        title: 'Réunion supprimée',
        description: 'La réunion RCP a été supprimée avec succès.',
      });
      setSelectedMeetingId(null);
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la réunion RCP.',
        variant: 'destructive',
      });
      console.error('Erreur lors de la suppression de la réunion:', error);
    },
  });

  // Formulaire pour créer une réunion
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      duration: 60,
    },
  });

  // Mutation pour créer une nouvelle réunion
  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      // Vérification que la durée est bien un nombre
      const durationValue = typeof values.duration === 'string' 
        ? parseInt(values.duration, 10) 
        : values.duration;
        
      return apiRequest('/api/rcp-meetings', 'POST', {
        ...values,
        duration: durationValue
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      toast({
        title: 'Réunion créée',
        description: 'La réunion RCP a été ajoutée avec succès.',
      });
      form.reset();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la réunion RCP.',
        variant: 'destructive',
      });
      console.error('Erreur lors de la création de la réunion:', error);
    },
  });

  // Mutation pour mettre à jour les présences
  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, attended }: { id: number; attended: boolean }) => {
      console.log(`Mise à jour de la présence ${id} -> ${attended}`);
      return apiRequest(`/api/rcp-attendances/${id}`, 'PATCH', { attended });
    },
    onSuccess: (data) => {
      console.log("Présence mise à jour avec succès:", data);

      // Mettre à jour le cache avec les nouvelles données de présence
      queryClient.setQueryData(
        ['/api/rcp-meetings', selectedMeetingId, 'attendances'],
        (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          
          // Rechercher l'index de l'élément mis à jour
          const index = oldData.findIndex((a: any) => a.id === data.id);
          
          // Si l'élément existe, le mettre à jour
          if (index >= 0) {
            const newData = [...oldData];
            newData[index] = data;
            return newData;
          }
          
          // Sinon, ajouter le nouveau
          return [...oldData, data];
        }
      );
      
      // Invalider explicitement toutes les requêtes pour forcer un rafraîchissement complet
      queryClient.invalidateQueries(); 
      
      // Refetch explicite des présences pour s'assurer que les changements sont pris en compte
      refetchAttendances();
      
      // Forcer un recalcul de la distribution après un délai
      setTimeout(() => {
        queryClient.fetchQuery({ queryKey: ['/api/distribution/calculation'] });
      }, 300);
    },
    onError: (error: any) => {
      console.error('Erreur détaillée lors de la mise à jour de la présence:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de mettre à jour la présence.',
        variant: 'destructive',
      });
      
      // En cas d'erreur, recharger les données pour annuler les changements optimistes
      refetchAttendances();
    },
  });

  // Mutation pour créer une présence
  const createAttendanceMutation = useMutation({
    mutationFn: ({ rcpId, associateId, attended }: { rcpId: number; associateId: number; attended: boolean }) => {
      console.log(`Création d'une présence pour la réunion ${rcpId}, associé ${associateId}, présent: ${attended}`);
      return apiRequest('/api/rcp-attendances', 'POST', { 
        rcpId, 
        associateId, 
        attended 
      });
    },
    onSuccess: (data) => {
      console.log("Nouvelle présence créée avec succès:", data);
      
      // Mettre à jour le cache avec les nouvelles données de présence
      queryClient.setQueryData(
        ['/api/rcp-meetings', selectedMeetingId, 'attendances'],
        (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return [data];
          
          // Rechercher si l'élément temporaire existe (remplacer notre ID temporaire)
          const tempIndex = oldData.findIndex((a: any) => 
            typeof a.id === 'string' && a.id.startsWith('temp-') && a.associateId === data.associateId
          );
          
          if (tempIndex >= 0) {
            // Remplacer l'élément temporaire par l'élément réel du serveur
            const newData = [...oldData];
            newData[tempIndex] = data;
            return newData;
          }
          
          // Vérifier si l'associé a déjà une entrée
          const existingIndex = oldData.findIndex((a: any) => a.associateId === data.associateId);
          if (existingIndex >= 0) {
            // Mettre à jour l'entrée existante
            const newData = [...oldData];
            newData[existingIndex] = data;
            return newData;
          }
          
          // Sinon, ajouter la nouvelle entrée
          return [...oldData, data];
        }
      );
      
      // Invalider explicitement toutes les requêtes pour forcer un rafraîchissement complet
      queryClient.invalidateQueries();
      
      // Refetch explicite des présences pour s'assurer que les changements sont pris en compte
      refetchAttendances();
      
      // Mettre à jour la réunion sélectionnée aussi
      if (selectedMeetingId) {
        // Force refresh of meeting data
        queryClient.fetchQuery({ queryKey: ['/api/rcp-meetings'] });
      }
      
      // Forcer un recalcul de la distribution après un délai
      setTimeout(() => {
        queryClient.fetchQuery({ queryKey: ['/api/distribution/calculation'] });
      }, 300);
    },
    onError: (error: any) => {
      console.error('Erreur détaillée lors de l\'ajout de la présence:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible d\'ajouter la présence.',
        variant: 'destructive',
      });
      
      // En cas d'erreur, recharger les données pour annuler les changements optimistes
      refetchAttendances();
    },
  });

  // Fonction pour gérer la soumission du formulaire
  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  // Gestion des présences/absences
  const handleAttendanceChange = (attendanceId: number | null, associateId: number, isPresent: boolean) => {
    // Vérification de sécurité: s'assurer que selectedMeetingId existe et est présent dans meetings
    if (!selectedMeetingId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une réunion valide',
        variant: 'destructive',
      });
      return;
    }
    
    // Vérifier que la réunion existe encore
    const meetingExists = meetings && Array.isArray(meetings) && meetings.some((m: any) => m && m.id === selectedMeetingId);
    if (!meetingExists) {
      toast({
        title: 'Erreur',
        description: 'Cette réunion n\'existe plus. Veuillez sélectionner une autre réunion.',
        variant: 'destructive',
      });
      setSelectedMeetingId(null);
      return;
    }
    
    // Optimistic update - mettre à jour l'interface immédiatement pour une meilleure réactivité
    // Cette technique simule la mise à jour locale avant confirmation par le serveur
    const optimisticUpdate = (isAttending: boolean) => {
      // Mise à jour optimiste pour les composants d'interface qui utilisent isAssociatePresent
      queryClient.setQueryData(
        ['/api/rcp-meetings', selectedMeetingId, 'attendances'],
        (oldData: any) => {
          if (!oldData || !Array.isArray(oldData)) return oldData;
          
          // Rechercher si l'associé est déjà dans la liste
          const index = oldData.findIndex((a: any) => a.associateId === associateId);
          
          if (index >= 0) {
            // Mise à jour d'une présence existante
            const newData = [...oldData];
            newData[index] = {
              ...newData[index],
              attended: isAttending
            };
            return newData;
          } else if (isAttending) {
            // Ajout d'une nouvelle présence optimiste
            return [
              ...oldData,
              {
                id: `temp-${Date.now()}`, // ID temporaire qui sera remplacé par l'ID réel
                rcpId: selectedMeetingId,
                associateId,
                attended: isAttending
              }
            ];
          }
          
          return oldData;
        }
      );
    };
    
    try {
      // Appliquer la mise à jour optimiste immédiatement
      optimisticUpdate(isPresent);
      
      if (attendanceId) {
        // Mise à jour d'une présence existante
        console.log(`Mise à jour d'une présence existante: ID ${attendanceId}, présent: ${isPresent}`);
        updateAttendanceMutation.mutate({ id: attendanceId, attended: isPresent });
      } else if (selectedMeetingId) {
        // Vérifier si l'associé est déjà assigné à cette réunion
        const existingAttendance = attendances && Array.isArray(attendances) 
          ? attendances.find((a: any) => a && a.associateId === associateId)
          : null;
        
        if (existingAttendance) {
          // Si l'associé est déjà assigné, mettre à jour sa présence au lieu d'en créer une nouvelle
          console.log(`Mise à jour d'une présence trouvée: ID ${existingAttendance.id}, présent: ${isPresent}`);
          updateAttendanceMutation.mutate({ id: existingAttendance.id, attended: isPresent });
        } else {
          // Création d'une nouvelle présence
          console.log(`Création d'une nouvelle présence: réunion ${selectedMeetingId}, associé ${associateId}, présent: ${isPresent}`);
          createAttendanceMutation.mutate({ 
            rcpId: selectedMeetingId, 
            associateId, 
            attended: isPresent 
          });
        }
      }
    } catch (error) {
      console.error("Erreur lors de la gestion des présences:", error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la gestion des présences.',
        variant: 'destructive',
      });
      
      // Annuler la mise à jour optimiste en cas d'erreur
      refetchAttendances();
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date non définie';
      
      // Vérifier si la date est au format ISO ou un autre format valide
      const date = dateString.includes('T') 
        ? parseISO(dateString) 
        : new Date(dateString);
        
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (e) {
      console.error('Erreur lors du formatage de la date:', e);
      return 'Date invalide';
    }
  };

  // Vérifier si un associé est présent à la réunion sélectionnée
  const isAssociatePresent = (associateId: number) => {
    if (!attendances || !Array.isArray(attendances)) return false;
    
    const attendance = attendances.find((a: any) => 
      a && typeof a === 'object' && a.associateId === associateId
    );
    
    return attendance && attendance.attended === true;
  };

  // Obtenir l'ID de présence pour un associé
  const getAttendanceId = (associateId: number) => {
    if (!attendances || !Array.isArray(attendances)) return null;
    
    const attendance = attendances.find((a: any) => 
      a && typeof a === 'object' && a.associateId === associateId
    );
    
    return attendance ? attendance.id : null;
  };
  
  // Compte le nombre d'associés présents
  const getPresentCount = () => {
    if (!attendances || !Array.isArray(attendances)) return 0;
    return attendances.filter((a: any) => a && a.attended === true).length;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Réunions de concertation pluriprofessionnelle (RCP)</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              Nouvelle réunion
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une réunion RCP</DialogTitle>
              <DialogDescription>
                Créez une nouvelle réunion de concertation pluriprofessionnelle.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Titre</FormLabel>
                      <FormControl>
                        <Input placeholder="RCP Mensuelle" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Détails de la réunion..." 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Durée (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="15" 
                          step="5" 
                          value={field.value?.toString() || "60"}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 60)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Création...' : 'Créer la réunion'}
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
              <CardTitle>Liste des réunions</CardTitle>
              <CardDescription>
                Sélectionnez une réunion pour gérer les présences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Chargement des réunions...</p>
              ) : meetings.length === 0 ? (
                <p>Aucune réunion RCP n'a été créée.</p>
              ) : (
                <ul className="space-y-2">
                  {meetings.map((meeting: any) => (
                    <li key={meeting.id}>
                      <Button
                        variant={selectedMeetingId === meeting.id ? "default" : "outline"}
                        className="w-full justify-start"
                        onClick={() => setSelectedMeetingId(meeting.id)}
                      >
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{meeting.title}</span>
                          <span className="text-sm text-muted-foreground">{formatDate(meeting.date)}</span>
                          <Badge variant="outline" className="mt-1">
                            {meeting.duration || 240} min
                          </Badge>
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
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>
                    {selectedMeeting ? (
                      <>
                        {selectedMeeting.title} - {formatDate(selectedMeeting.date)}
                      </>
                    ) : (
                      'Gestion des présences'
                    )}
                  </CardTitle>
                  <CardDescription>
                    {selectedMeeting ? (
                      <>
                        Durée: {selectedMeeting.duration || 240} minutes
                        {selectedMeeting.description && (
                          <p className="mt-2">{selectedMeeting.description}</p>
                        )}
                      </>
                    ) : (
                      'Sélectionnez une réunion pour gérer les présences'
                    )}
                  </CardDescription>
                </div>
                
                {selectedMeeting && (
                  <div className="flex gap-2">
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Modifier la réunion RCP</DialogTitle>
                          <DialogDescription>
                            Modifiez les détails de la réunion de concertation pluriprofessionnelle.
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(values => updateMutation.mutate(values))} className="space-y-4">
                            <FormField
                              control={editForm.control}
                              name="date"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Date</FormLabel>
                                  <FormControl>
                                    <Input type="date" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name="title"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Titre</FormLabel>
                                  <FormControl>
                                    <Input placeholder="RCP Mensuelle" {...field} />
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
                                      placeholder="Détails de la réunion..." 
                                      {...field} 
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name="duration"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Durée (minutes)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="15" 
                                      step="5" 
                                      value={field.value?.toString() || "60"}
                                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 60)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <DialogFooter>
                              <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? 'Mise à jour...' : 'Mettre à jour'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>

                    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action ne peut pas être annulée. Cela supprimera définitivement cette réunion RCP
                            et toutes les données de présence associées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={(e) => {
                              e.preventDefault(); // Empêcher l'action par défaut
                              deleteMutation.mutate();
                            }}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedMeetingId ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <Info className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                    <p>Veuillez sélectionner une réunion dans la liste à gauche pour gérer les présences.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Section d'informations sur la réunion */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex flex-col md:flex-row md:justify-between gap-4">
                      <div>
                        <div className="flex items-center mb-2">
                          <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium">Date:</span> 
                          <span className="ml-2">{formatDate(selectedMeeting?.date || '')}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium">Durée:</span>
                          <span className="ml-2">{selectedMeeting?.duration || 0} minutes</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center mb-2">
                          <Users className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium">Présences:</span>
                          <Badge className="ml-2" variant="outline">
                            {getPresentCount()} / {associates.length}
                          </Badge>
                        </div>
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium">Statut:</span>
                          {isLoadingAttendances ? (
                            <Badge className="ml-2" variant="outline">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Chargement...
                            </Badge>
                          ) : (
                            <Badge className="ml-2" variant={getPresentCount() > 0 ? "default" : "destructive"}>
                              {getPresentCount() > 0 ? "Réunion validée" : "Aucun participant"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Explication pour l'utilisateur */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Gestion des présences</AlertTitle>
                    <AlertDescription>
                      Cochez les cases pour marquer les associés présents à cette réunion.
                      Ces présences seront prises en compte dans le calcul de la répartition des revenus.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Liste des participants
                    </h3>
                    <div className="text-sm text-blue-600 font-medium">
                      {!isLoadingAttendances && selectedMeeting && (
                        <span className="flex items-center">
                          <Check className="h-4 w-4 mr-1" />
                          {getPresentCount()} présent(s) / {associates.length} associés
                        </span>
                      )}
                    </div>
                  </div>
                  <Separator className="mb-4" />
                  
                  {isLoadingAttendances ? (
                    // Affichage pendant le chargement
                    <div className="py-8 space-y-4">
                      <div className="animate-pulse flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                      </div>
                      <p className="text-center text-sm text-muted-foreground">
                        Chargement des données de présence...
                      </p>
                    </div>
                  ) : attendancesError ? (
                    // Affichage en cas d'erreur
                    <div className="py-8 space-y-4">
                      <div className="text-center">
                        <AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-2" />
                        <p className="font-medium text-red-600">Erreur de chargement</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Impossible de récupérer les données de présence. Veuillez réessayer plus tard.
                        </p>
                        <Button 
                          variant="outline" 
                          className="mt-4"
                          onClick={() => refetchAttendances()}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Réessayer
                        </Button>
                      </div>
                    </div>
                  ) : associates.length === 0 ? (
                    <div className="text-center p-8 bg-gray-50 rounded border">
                      <p>Aucun associé trouvé. Veuillez ajouter des associés dans la section "Associés".</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {associates.map((associate: any) => {
                        if (!associate || !associate.id) return null;
                        
                        const isPresent = isAssociatePresent(associate.id);
                        const attendanceId = getAttendanceId(associate.id);
                        
                        return (
                          <div 
                            key={associate.id} 
                            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                              isPresent 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div>
                              <p className="font-medium">{associate.name}</p>
                              <p className="text-sm text-muted-foreground">{associate.profession}</p>
                              {associate.isManager && (
                                <Badge className="mt-1" variant="outline">Co-gérant</Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`attendance-${associate.id}`}
                                  checked={isPresent}
                                  onCheckedChange={(checked) => {
                                    handleAttendanceChange(attendanceId, associate.id, checked === true);
                                  }}
                                />
                                <Label htmlFor={`attendance-${associate.id}`} className="cursor-pointer">
                                  {isPresent ? 'Présent' : 'Absent'}
                                </Label>
                              </div>
                              
                              {/* Indicateur visuel de présence */}
                              {isPresent ? (
                                <Badge className="bg-green-500 text-white">
                                  <Check className="h-4 w-4 mr-1" />
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                                  <X className="h-4 w-4" />
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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