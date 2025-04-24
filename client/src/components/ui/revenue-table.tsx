import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
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
  DialogFooter,
} from "@/components/ui/dialog";
import RevenueForm from "./revenue-form";

interface Revenue {
  id: number;
  source: string;
  description: string;
  amount: string;
  date: string;
  category: string;
}

interface RevenueTableProps {
  revenues: Revenue[];
  isLoading: boolean;
}

export default function RevenueTable({ revenues = [], isLoading }: RevenueTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRevenue, setSelectedRevenue] = useState<Revenue | null>(null);

  const handleEdit = (revenue: Revenue) => {
    setSelectedRevenue(revenue);
    setEditDialogOpen(true);
  };

  const handleDelete = (revenue: Revenue) => {
    setSelectedRevenue(revenue);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedRevenue) return;
    
    try {
      await apiRequest("DELETE", `/api/revenues/${selectedRevenue.id}`, undefined);
      
      toast({
        title: "Revenu supprimé",
        description: "Le revenu a été supprimé avec succès.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/revenues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/distribution/calculation"] });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du revenu.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedRevenue(null);
  };

  const columns: ColumnDef<Revenue>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "source",
      header: "Source",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "category",
      header: "Catégorie",
    },
    {
      accessorKey: "amount",
      header: "Montant",
      cell: ({ row }) => formatCurrency(parseFloat(row.original.amount)),
      sortingFn: "basic",
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

  const totalRevenue = revenues.reduce(
    (sum, revenue) => sum + parseFloat(revenue.amount),
    0
  );

  return (
    <div>
      <DataTable
        columns={columns}
        data={revenues}
        searchColumn="description"
        isLoading={isLoading}
      />

      {revenues.length > 0 && (
        <div className="mt-4 text-right">
          <p className="font-semibold text-lg">
            Total: {formatCurrency(totalRevenue)}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le revenu</DialogTitle>
            <DialogDescription>
              Modifiez les détails du revenu sélectionné.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRevenue && (
            <RevenueForm
              isEdit
              revenueId={selectedRevenue.id}
              defaultValues={{
                source: selectedRevenue.source,
                description: selectedRevenue.description,
                amount: parseFloat(selectedRevenue.amount),
                date: new Date(selectedRevenue.date),
                category: selectedRevenue.category,
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
              Êtes-vous sûr de vouloir supprimer ce revenu ? Cette action ne peut pas être annulée.
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
