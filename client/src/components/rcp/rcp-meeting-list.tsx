import React from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarDays, Clock, Users, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

interface RcpMeetingListProps {
  meetings: any[];
  selectedMeetingId: number | null;
  setSelectedMeetingId: (id: number) => void;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function RcpMeetingList({ 
  meetings, 
  selectedMeetingId, 
  setSelectedMeetingId, 
  isLoading, 
  error, 
  refetch 
}: RcpMeetingListProps) {
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Liste des réunions</CardTitle>
        <CardDescription>
          Sélectionnez une réunion pour voir et gérer les présences
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
              Erreur lors du chargement des réunions
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
  );
}