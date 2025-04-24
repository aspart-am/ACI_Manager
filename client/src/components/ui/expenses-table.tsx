import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ColumnDef } from "@tanstack/react-table";
import { Edit, Trash2, AlertCircle, Repeat } from "lucide-react";
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
import ExpenseForm from "./expense-form";

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: string;
  date: string;
  isRecurring: boolean;
  frequency?: string;
}

interface ExpensesTableProps {
  expenses: Expense[];
  isLoading: boolean;
  filter: "all" | "fixed" | "variable";
}

export default function ExpensesTable({ 
  expenses = [], 
  isLoading,
  filter = "all"
}: ExpensesTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setEditDialogOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedExpense) return;
    
    try {
      await apiRequest("DELETE", `/api/expenses/${selectedExpense.id}`, undefined);
      
      toast({
        title: "Charge supprimée",
        description: "La charge a été supprimée avec succès.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/distribution/calculation"] });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression de la charge.",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedExpense(null);
  };

  // Format frequency label
  const getFrequencyLabel = (frequency?: string) => {
    switch (frequency) {
      case "monthly": return "Mensuelle";
      case "quarterly": return "Trimestrielle";
      case "semi-annual": return "Semestrielle";
      case "annual": return "Annuelle";
      default: return "Mensuelle";
    }
  };

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "category",
      header: "Catégorie",
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "amount",
      header: "Montant",
      cell: ({ row }) => formatCurrency(parseFloat(row.original.amount)),
      sortingFn: "basic",
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "isRecurring",
      header: "Type",
      cell: ({ row }) => (
        row.original.isRecurring ? (
          <div className="flex items-center">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
              <Repeat className="mr-1 h-3 w-3" />
              Fixe
            </Badge>
            <span className="ml-2 text-xs text-gray-500">
              {getFrequencyLabel(row.original.frequency)}
            </span>
          </div>
        ) : (
          <Badge variant="outline">Variable</Badge>
        )
      ),
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

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + parseFloat(expense.amount),
    0
  );

  return (
    <div>
      <DataTable
        columns={columns}
        data={expenses}
        searchColumn="description"
        isLoading={isLoading}
      />

      {expenses.length > 0 && (
        <div className="mt-4 text-right">
          <p className="font-semibold text-lg">
            Total: {formatCurrency(totalExpenses)}
          </p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier la charge</DialogTitle>
            <DialogDescription>
              Modifiez les détails de la charge sélectionnée.
            </DialogDescription>
          </DialogHeader>
          
          {selectedExpense && (
            <ExpenseForm
              isEdit
              expenseId={selectedExpense.id}
              defaultValues={{
                category: selectedExpense.category,
                description: selectedExpense.description,
                amount: parseFloat(selectedExpense.amount),
                date: new Date(selectedExpense.date),
                isRecurring: selectedExpense.isRecurring,
                frequency: selectedExpense.frequency,
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
              Êtes-vous sûr de vouloir supprimer cette charge ? Cette action ne peut pas être annulée.
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
