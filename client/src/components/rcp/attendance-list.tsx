import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface AttendanceListProps {
  associates: any[];
  isAttendanceChecked: (associateId: number) => boolean;
  handleAttendanceChange: (associateId: number, checked: boolean) => void;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

export function AttendanceList({
  associates,
  isAttendanceChecked,
  handleAttendanceChange,
  isLoading,
  error,
  refetch
}: AttendanceListProps) {
  if (isLoading) {
    return (
      <div className="py-8 space-y-4">
        <div className="animate-pulse flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Chargement des données de présence...
        </p>
      </div>
    );
  }

  if (error) {
    return (
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
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!Array.isArray(associates) || associates.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded border">
        <p>Aucun associé trouvé. Veuillez ajouter des associés dans la section "Associés".</p>
      </div>
    );
  }

  return (
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
  );
}