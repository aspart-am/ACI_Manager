import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  Users, 
  Check, 
  CalendarDays, 
  Clock, 
  Edit, 
  Trash2, 
  Info
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader,
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
import { formatDate } from '@/components/ui/format-date';

// Import des composants refactorisés
import { RcpMeetingList } from '@/components/rcp/rcp-meeting-list';
import { RcpMeetingForm, RcpFormValues } from '@/components/rcp/rcp-meeting-form';
import { AttendanceList } from '@/components/rcp/attendance-list';

export default function RcpMeetings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // État local pour les dialogues
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
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

  // Mutation pour créer une nouvelle réunion
  const createMutation = useMutation({
    mutationFn: (values: RcpFormValues) => {
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
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error?.message || 'Une erreur est survenue lors de la création de la réunion.',
        variant: 'destructive',
      });
    },
  });

  // Mutation pour mettre à jour une réunion
  const updateMutation = useMutation({
    mutationFn: (values: RcpFormValues) => {
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
            <RcpMeetingForm 
              onSubmit={createMutation.mutate}
              isSubmitting={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Liste des réunions RCP (sidebar) */}
        <div className="lg:col-span-4">
          <RcpMeetingList 
            meetings={meetings}
            selectedMeetingId={selectedMeetingId}
            setSelectedMeetingId={setSelectedMeetingId}
            isLoading={isLoadingMeetings}
            error={meetingsError}
            refetch={refetchMeetings}
          />
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
                        <RcpMeetingForm 
                          defaultValues={{
                            date: selectedMeeting.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                            title: selectedMeeting.title || '',
                            description: selectedMeeting.description || '',
                            duration: selectedMeeting.duration || 60,
                          }}
                          onSubmit={updateMutation.mutate}
                          isSubmitting={updateMutation.isPending}
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
                  <Alert className="my-4">
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
                  
                  <AttendanceList 
                    associates={associates}
                    isAttendanceChecked={isAttendanceChecked}
                    handleAttendanceChange={handleAttendanceChange}
                    isLoading={isLoadingAssociates || isLoadingAttendances}
                    error={attendancesError}
                    refetch={refetchAttendances}
                  />
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