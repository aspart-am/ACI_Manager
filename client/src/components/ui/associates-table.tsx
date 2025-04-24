import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2, AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AssociateForm from "./associate-form";
import { getInitials } from "@/lib/utils";

interface Associate {
  id: number;
  name: string;
  profession: string;
  isManager: boolean;
  joinDate: string;
  patientCount: number;
  participationWeight: string;
}

interface AssociatesTableProps {
  associates: Associate[];
  isLoading: boolean;
  filter: "all" | "managers" | "non-managers";
}

export default function AssociatesTable({ 
  associates = [], 
  isLoading,
  filter = "all"
}: AssociatesTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAssociate, setSelectedAssociate] = useState<Associate | null>(null);

  const handleEdit = (associate: Associate) => {
    setSelectedAssociate(associate);
    setEditDialogOpen(true);
  };

  const handleDelete = (associate: Associate) => {
    setSelectedAssociate(associate);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedAssociate) return;
    
    try {
      await apiRequest("DELETE", `/api/associates/${selectedAssociate.id}`, undefined);
      
      toast({
        title: "Associé supprimé",
        description: "L'associé a été supprimé avec succès.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/associates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/distribution/calculation"] });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de l'associé.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedAssociate(null);
  };

  const columns: ColumnDef<Associate>[] = [
    {
      accessorKey: "name",
      header: "Nom",
      cell: ({ row }) => (
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8 bg-blue-100 text-blue-600">
            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <span>{row.original.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "profession",
      header: "Profession",
    },
    {
      accessorKey: "isManager",
      header: "Statut",
      cell: ({ row }) => (
        row.original.isManager ? (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Gérant</Badge>
        ) : (
          <Badge variant="outline">Associé</Badge>
        )
      ),
    },
    {
      accessorKey: "joinDate",
      header: "Date d'intégration",
      cell: ({ row }) => formatDate(row.original.joinDate),
    },
    {
      accessorKey: "patientCount",
      header: "Patients",
      cell: ({ row }) => (
        row.original.profession === "Médecin généraliste" 
          ? row.original.patientCount
          : "-"
      ),
    },
    {
      accessorKey: "participationWeight",
      header: "Poids",
      cell: ({ row }) => `×${parseFloat(row.original.participationWeight).toFixed(1)}`,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(row.original)}
            className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDelete(row.original)}
            className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={associates}
        searchColumn="name"
        isLoading={isLoading}
      />

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier l'associé</DialogTitle>
            <DialogDescription>
              Modifiez les informations de l'associé sélectionné.
            </DialogDescription>
          </DialogHeader>
          
          {selectedAssociate && (
            <AssociateForm
              isEdit
              associateId={selectedAssociate.id}
              defaultValues={{
                name: selectedAssociate.name,
                profession: selectedAssociate.profession,
                isManager: selectedAssociate.isManager,
                joinDate: new Date(selectedAssociate.joinDate),
                patientCount: selectedAssociate.patientCount,
                participationWeight: parseFloat(selectedAssociate.participationWeight),
              }}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertCircle className="h-6 w-6 text-red-600 mb-2" />
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cet associé ? Cette action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
