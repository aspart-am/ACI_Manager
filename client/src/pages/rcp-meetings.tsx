import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Calendar, 
  Users, 
  Check, 
  CalendarDays, 
  Clock, 
  Edit, 
  Trash2, 
  Info,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Schéma de validation pour le formulaire
const formSchema = z.object({
  date: z.string().min(1, { message: 'La date est requise' }),
  title: z.string().min(1, { message: 'Le titre est requis' }),
  description: z.string().optional(),
  duration: z.number().min(15, { message: 'La durée minimale est de 15 minutes' })
});

type FormValues = z.infer<typeof formSchema>;

export default function RcpMeetings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // État local pour les dialogues
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Gestion du formulaire avec react-hook-form et zod
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      duration: 60,
    },
  });
  
  // Récupération des réunions RCP
  const { 
    data: meetings = [], 
    isLoading: isLoadingMeetings,
    error: meetingsError, 
    refetch: refetchMeetings
  } = useQuery({
    queryKey: ['/api/rcp-meetings'],
    staleTime: 30000, 
  });

  // Récupération des associés
  const {
    data: associates = [],
    isLoading: isLoadingAssociates
  } = useQuery({
    queryKey: ['/api/associates'],
    staleTime: 60000,
  });
  
  // Sélectionner une réunion de la liste
  const selectedMeeting = meetings.find((meeting: any) => meeting.id === selectedMeetingId);
  
  // Récupération des présences pour la réunion sélectionnée
  const {
    data: attendances = [],
    isLoading: isLoadingAttendances,
    error: attendancesError,
    refetch: refetchAttendances
  } = useQuery({
    queryKey: ['/api/rcp-meetings', selectedMeetingId, 'attendances'],
    enabled: !!selectedMeetingId,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  
  // Initialiser le formulaire d'édition quand une réunion est sélectionnée
  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: '',
      title: '',
      description: '',
      duration: 60,
    },
  });
  
  useEffect(() => {
    if (selectedMeeting) {
      editForm.reset({
        date: selectedMeeting.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        title: selectedMeeting.title || '',
        description: selectedMeeting.description || '',
        duration: selectedMeeting.duration || 60,
      });
    }
  }, [selectedMeeting, editForm]);

  // Mutation pour créer une nouvelle réunion
  const createMutation = useMutation({
    mutationFn: (values: FormValues) => {
      return apiRequest('/api/rcp-meetings', 'POST', values);
    },
    onSuccess: (data) => {
      setIsDialogOpen(false);
      
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      
      toast({
        title: 'Réunion créée',
        description: 'La réunion a été créée avec succès.',
      });
      
      // Sélectionner automatiquement la nouvelle réunion créée
      setTimeout(() => {
        setSelectedMeetingId(data.id);
      }, 300);
      
      // Réinitialiser le formulaire
      form.reset({
        date: new Date().toISOString().split('T')[0],
        title: '',
        description: '',
        duration: 60,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue lors de la création de la réunion.',
        variant: 'destructive',
      });
    },
  });

  // Fonction pour gérer la soumission du formulaire
  function onSubmit(values: FormValues) {
    createMutation.mutate(values);
  }
  
  // Mutation pour mettre à jour une présence
  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, attended }: { id: number; attended: boolean }) => {
      return apiRequest(`/api/rcp-attendances/${id}`, 'PATCH', { attended });
    },
    onSuccess: () => {
      // Invalider les requêtes
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings', selectedMeetingId, 'attendances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la présence.',
        variant: 'destructive',
      });
      
      refetchAttendances();
    },
  });

  // Mutation pour créer une présence
  const createAttendanceMutation = useMutation({
    mutationFn: ({ rcpId, associateId, attended }: { rcpId: number; associateId: number; attended: boolean }) => {
      return apiRequest('/api/rcp-attendances', 'POST', { rcpId, associateId, attended });
    },
    onSuccess: () => {
      // Invalider les requêtes
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings', selectedMeetingId, 'attendances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter la présence.',
        variant: 'destructive',
      });
      
      refetchAttendances();
    },
  });
  
  // Mutation pour mettre à jour une réunion
  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => {
      return apiRequest(`/api/rcp-meetings/${selectedMeetingId}`, 'PATCH', values);
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      
      // Invalider les requêtes pour mettre à jour l'interface
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      
      toast({
        title: 'Réunion mise à jour',
        description: 'La réunion a été mise à jour avec succès.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue lors de la mise à jour de la réunion.',
        variant: 'destructive',
      });
    },
  });
  
  // Mutation pour supprimer une réunion
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/rcp-meetings/${id}`, 'DELETE');
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      
      // Invalider les requêtes pour mettre à jour l'interface
      queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/distribution/calculation'] });
      
      toast({
        title: 'Réunion supprimée',
        description: 'La réunion a été supprimée avec succès.',
      });
      
      setSelectedMeetingId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue lors de la suppression de la réunion.',
        variant: 'destructive',
      });
    },
  });

  // Gestion des présences/absences
  const handleAttendanceChange = (associateId: number, attended: boolean) => {
    if (!selectedMeetingId) return;
    
    // Recherche d'une présence existante pour cet associé
    const existingAttendance = attendances.find((a: any) => a.associateId === associateId);
    
    if (existingAttendance) {
      // Mise à jour d'une présence existante
      updateAttendanceMutation.mutate({ 
        id: existingAttendance.id, 
        attended 
      });
    } else {
      // Création d'une nouvelle présence
      createAttendanceMutation.mutate({ 
        rcpId: selectedMeetingId, 
        associateId, 
        attended 
      });
    }
  };
  
  // Fonction pour formater la date
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'Date non définie';
      
      const date = dateString.includes('T') 
        ? parseISO(dateString) 
        : new Date(dateString);
        
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };
  
  // Vérifier si un associé est présent à la réunion
  const isAttendanceChecked = (associateId: number): boolean => {
    if (!attendances || !Array.isArray(attendances)) return false;
    const attendance = attendances.find((a: any) => a.associateId === associateId);
    return attendance ? attendance.attended : false;
  };
  
  // Compter le nombre d'associés présents
  const getPresentCount = (): number => {
    if (!attendances || !Array.isArray(attendances)) return 0;
    return attendances.filter((a: any) => a.attended).length;
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Liste des réunions RCP (sidebar) */}
        <div className="lg:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Liste des réunions</CardTitle>
              <CardDescription>
                Sélectionnez une réunion pour voir et gérer les présences
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMeetings ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : meetingsError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Erreur lors du chargement des réunions
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => refetchMeetings()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Réessayer
                  </Button>
                </div>
              ) : !Array.isArray(meetings) || meetings.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300" />
                  <p>Aucune réunion RCP trouvée</p>
                  <p className="text-sm text-muted-foreground">
                    Cliquez sur "Nouvelle réunion" pour commencer
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {meetings.map((meeting: any) => (
                    <div 
                      key={meeting.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedMeetingId === meeting.id 
                          ? 'bg-blue-50 border-blue-200'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedMeetingId(meeting.id)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-medium">{meeting.title}</h3>
                        {meeting.attendanceCount > 0 && (
                          <Badge variant="outline" className="ml-2">
                            <Users className="h-3 w-3 mr-1" />
                            {meeting.attendanceCount}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                        <span className="flex items-center">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {formatDate(meeting.date)}
                        </span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {meeting.duration} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Détails de la réunion sélectionnée */}
        <div className="lg:col-span-8">
          {selectedMeetingId && selectedMeeting ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedMeeting.title}</CardTitle>
                    <CardDescription>
                      {formatDate(selectedMeeting.date)}
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
                          <DialogTitle>Modifier la réunion</DialogTitle>
                          <DialogDescription>
                            Modifiez les informations de cette réunion RCP.
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
                        <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Supprimer
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer cette réunion ? Cette action est irréversible
                            et supprimera également toutes les présences associées.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-500 hover:bg-red-600"
                            onClick={() => deleteMutation.mutate(selectedMeetingId)}
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
                {/* Informations détaillées de la réunion */}
                <div>
                  <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">Détails de la réunion</h3>
                      <div className="mt-2 space-y-1 text-sm">
                        {selectedMeeting.description && (
                          <p className="text-muted-foreground">{selectedMeeting.description}</p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                          <span className="flex items-center text-muted-foreground">
                            <CalendarDays className="h-4 w-4 mr-1" />
                            {formatDate(selectedMeeting.date)}
                          </span>
                          <span className="flex items-center text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {selectedMeeting.duration} minutes
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {getPresentCount()} présent(s)
                          </span>
                          {Array.isArray(associates) && associates.length > 0 && (
                            <Badge variant="outline" className="ml-auto">
                              {Math.round((getPresentCount() / associates.length) * 100)}% de participation
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
                  
                  <div className="flex justify-between items-center mt-6 mb-3">
                    <h3 className="text-lg font-medium flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Liste des participants
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="text-sm text-blue-600 font-medium">
                        <span className="flex items-center">
                          <Check className="h-4 w-4 mr-1" />
                          {getPresentCount()} présent(s) / {associates.length} associés
                        </span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetchAttendances()}
                        disabled={isLoadingAttendances}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${isLoadingAttendances ? 'animate-spin' : ''}`} />
                        Rafraîchir
                      </Button>
                    </div>
                  </div>
                  <Separator className="mb-4" />
                  
                  {isLoadingAssociates || isLoadingAttendances ? (
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
                  ) : !Array.isArray(associates) || associates.length === 0 ? (
                    <div className="text-center p-8 bg-gray-50 rounded border">
                      <p>Aucun associé trouvé. Veuillez ajouter des associés dans la section "Associés".</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {associates.map((associate: any) => {
                        const isPresent = isAttendanceChecked(associate.id);
                        
                        return (
                          <div 
                            key={associate.id} 
                            className={`flex p-4 rounded-lg border transition-colors ${
                              isPresent 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-white hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-3/5 pr-2">
                              <p className="font-medium">{associate.name}</p>
                              <p className="text-sm text-muted-foreground">{associate.profession}</p>
                              {associate.isManager && (
                                <Badge className="mt-1" variant="outline">Co-gérant</Badge>
                              )}
                            </div>
                            <div className="w-2/5 flex items-center justify-end">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`attendance-${associate.id}`}
                                  checked={isPresent}
                                  onCheckedChange={(checked) => {
                                    handleAttendanceChange(associate.id, checked === true);
                                  }}
                                />
                                <Label htmlFor={`attendance-${associate.id}`} className="cursor-pointer whitespace-nowrap">
                                  {isPresent ? 'Présent' : 'Absent'}
                                </Label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto text-gray-200 mb-4" />
                <h3 className="text-xl font-medium mb-2">Aucune réunion sélectionnée</h3>
                <p className="text-muted-foreground max-w-md">
                  Veuillez sélectionner une réunion dans la liste ou créer une nouvelle réunion
                  pour gérer les présences.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}