import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProjectAssignmentsListProps {
  assignments: any[];
  associates: any[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  totalContribution: number;
  isBalanced: boolean;
  onContributionChange: (assignmentId: number, value: string) => void;
  onDeleteAssignment: (assignmentId: number) => void;
  isProcessing: boolean;
}

export function ProjectAssignmentsList({
  assignments,
  associates,
  isLoading,
  error,
  refetch,
  totalContribution,
  isBalanced,
  onContributionChange,
  onDeleteAssignment,
  isProcessing
}: ProjectAssignmentsListProps) {
  return (
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
      
      {isLoading ? (
        <div className="py-8 space-y-4">
          <div className="animate-pulse flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Chargement des affectations...
          </p>
        </div>
      ) : error ? (
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
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      ) : !Array.isArray(assignments) || assignments.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded border">
          <p>Aucun associé n'est affecté à ce projet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Cliquez sur "Ajouter un associé" pour commencer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {assignments.map((assignment: any) => {
            const associateId = assignment.associateId;
            const associate = Array.isArray(associates) 
              ? associates.find((a: any) => a.id === associateId) 
              : null;
              
            return (
              <div 
                key={assignment.id} 
                className="flex p-4 rounded-lg border transition-colors hover:bg-gray-50"
              >
                <div className="w-3/5 pr-2">
                  <p className="font-medium">{associate ? associate.name : `Associé ${associateId}`}</p>
                  <p className="text-sm text-muted-foreground">{associate ? associate.profession : ''}</p>
                  {associate && associate.isManager && (
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
                      onChange={(e) => onContributionChange(assignment.id, e.target.value)}
                      disabled={isProcessing}
                      className="w-full text-right"
                    />
                  </div>
                  <span className="text-sm font-medium">%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteAssignment(assignment.id)}
                    disabled={isProcessing}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}