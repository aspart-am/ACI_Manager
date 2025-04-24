import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar, Pencil, Trash2, Check, X } from 'lucide-react';

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
  const { data: attendances = [], refetch: refetchAttendances } = useQuery({
    queryKey: ['/api/rcp-meetings', selectedMeetingId, 'attendances'],
    enabled: !!selectedMeetingId,
  }) as { data: any[], refetch: () => void };

  // Récupération des données pour une réunion spécifique
  const { data: selectedMeeting } = useQuery({
    queryKey: ['/api/rcp-meetings', selectedMeetingId],
    enabled: !!selectedMeetingId,
  }) as { data: any };
  
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
      editForm.reset({
        date: selectedMeeting.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        title: selectedMeeting.title || '',
        description: selectedMeeting.description || '',
        duration: selectedMeeting.duration || 60,
      });
    }
  }, [selectedMeeting, editForm]);
  
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
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings', selectedMeetingId] });
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
    mutationFn: ({ id, attended }: { id: number; attended: boolean }) => 
      apiRequest(`/api/rcp-attendances/${id}`, 'PATCH', { attended }),
    onSuccess: () => {
      // Invalider les requêtes de réunions et de présences
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings', selectedMeetingId, 'attendances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] }); // Très important pour la répartition
      toast({
        title: 'Présence mise à jour',
        description: 'La présence a été mise à jour avec succès.',
      });
      // Important: refetch les données après le succès
      setTimeout(() => refetchAttendances(), 300);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la présence.',
        variant: 'destructive',
      });
      console.error('Erreur lors de la mise à jour de la présence:', error);
    },
  });

  // Mutation pour créer une présence
  const createAttendanceMutation = useMutation({
    mutationFn: ({ rcpId, associateId, attended }: { rcpId: number; associateId: number; attended: boolean }) => 
      apiRequest('/api/rcp-attendances', 'POST', { rcpId, associateId, attended }),
    onSuccess: () => {
      // Invalider les requêtes de réunions et de présences
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings', selectedMeetingId, 'attendances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] }); // Très important pour la répartition
      toast({
        title: 'Présence ajoutée',
        description: 'La présence a été ajoutée avec succès.',
      });
      // Important: refetch les données après le succès
      setTimeout(() => refetchAttendances(), 300);
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter la présence.',
        variant: 'destructive',
      });
      console.error('Erreur lors de l\'ajout de la présence:', error);
    },
  });

  // Fonction pour gérer la soumission du formulaire
  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }

  // Gestion des présences/absences
  const handleAttendanceChange = (attendanceId: number | null, associateId: number, isPresent: boolean) => {
    if (attendanceId) {
      // Mise à jour d'une présence existante
      updateAttendanceMutation.mutate({ id: attendanceId, attended: isPresent });
    } else if (selectedMeetingId) {
      // Vérifier si l'associé est déjà assigné à cette réunion
      const existingAttendance = attendances.find((a: any) => a.associate_id === associateId);
      
      if (existingAttendance) {
        // Si l'associé est déjà assigné, mettre à jour sa présence au lieu d'en créer une nouvelle
        updateAttendanceMutation.mutate({ id: existingAttendance.id, attended: isPresent });
      } else {
        // Création d'une nouvelle présence
        createAttendanceMutation.mutate({ rcpId: selectedMeetingId, associateId, attended: isPresent });
      }
    }
  };

  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (e) {
      return dateString;
    }
  };

  // Vérifier si un associé est présent à la réunion sélectionnée
  const isAssociatePresent = (associateId: number) => {
    const attendance = attendances.find((a: any) => a.associate_id === associateId);
    return attendance ? attendance.attended : false;
  };

  // Obtenir l'ID de présence pour un associé
  const getAttendanceId = (associateId: number) => {
    const attendance = attendances.find((a: any) => a.associate_id === associateId);
    return attendance ? attendance.id : null;
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
                            {meeting.duration || 60} min
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
                        Durée: {selectedMeeting.duration || 60} minutes
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
                <p>Veuillez sélectionner une réunion dans la liste à gauche.</p>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Liste des associés</h3>
                  <Separator />
                  {associates.length === 0 ? (
                    <p>Aucun associé trouvé.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {associates.map((associate: any) => {
                        const isPresent = isAssociatePresent(associate.id);
                        const attendanceId = getAttendanceId(associate.id);
                        return (
                          <div key={associate.id} className="flex items-center justify-between p-3 border rounded-md">
                            <div>
                              <p className="font-medium">{associate.name}</p>
                              <p className="text-sm text-muted-foreground">{associate.profession}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`attendance-${associate.id}`}
                                checked={isPresent}
                                onCheckedChange={(checked) => {
                                  console.log("Checkbox changed:", associate.id, checked);
                                  handleAttendanceChange(attendanceId, associate.id, checked === true);
                                }}
                              />
                              <Label htmlFor={`attendance-${associate.id}`}>
                                {isPresent ? "Présent" : "Absent"}
                              </Label>
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