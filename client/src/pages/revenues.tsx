import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CalendarIcon, Trash2, ReceiptIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Schéma de validation pour le formulaire de revenus
const formSchema = z.object({
  source: z.string().min(2, "La source doit comporter au moins 2 caractères"),
  amount: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().positive("Le montant doit être positif")
  ),
  date: z.string().min(1, "La date est requise"),
  description: z.string().optional(),
  category: z.string().default("ACI"),
});

type FormValues = z.infer<typeof formSchema>;

export default function Revenues() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [isAddRevenueModalOpen, setIsAddRevenueModalOpen] = useState(false);
  const [revenueToDelete, setRevenueToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Formulaire pour ajouter un revenu
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      description: "",
      category: "ACI",
    },
  });

  // Fetch revenues data
  const { data: revenues, isLoading: isLoadingRevenues } = useQuery({
    queryKey: ["/api/revenues"],
  });

  // Filter revenues by year
  const filteredRevenues = Array.isArray(revenues)
    ? revenues.filter(
        (revenue: any) => revenue && revenue.date && new Date(revenue.date).getFullYear() === year
      )
    : [];

  // Calculate total revenue
  const totalRevenue = filteredRevenues.reduce(
    (sum: number, revenue: any) => sum + parseFloat(revenue.amount),
    0
  );

  // Mutation pour ajouter un revenu
  const addRevenueMutation = useMutation({
    mutationFn: (values: FormValues) => {
      return apiRequest("/api/revenues", "POST", values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revenues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/distribution/calculation"] });
      toast({
        title: "Revenu ajouté",
        description: "Le revenu a été ajouté avec succès",
      });
      form.reset();
      setIsAddRevenueModalOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le revenu",
        variant: "destructive",
      });
      console.error("Erreur lors de l'ajout du revenu:", error);
    },
  });

  // Mutation pour supprimer un revenu
  const deleteRevenueMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/revenues/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/revenues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/distribution/calculation"] });
      toast({
        title: "Revenu supprimé",
        description: "Le revenu a été supprimé avec succès",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le revenu",
        variant: "destructive",
      });
      console.error("Erreur lors de la suppression du revenu:", error);
    },
  });

  // Gestion des années
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    years.push(i);
  }

  // Soumission du formulaire
  function onSubmit(values: FormValues) {
    addRevenueMutation.mutate(values);
  }

  // Gestion de la suppression
  const handleDeleteClick = (id: number) => {
    setRevenueToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (revenueToDelete) {
      deleteRevenueMutation.mutate(revenueToDelete);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Revenus</h1>
        <div className="flex items-center space-x-4">
          <select
            className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-700"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                Année {y}
              </option>
            ))}
          </select>
          <Button 
            onClick={() => setIsAddRevenueModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un revenu
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-gray-500">Dotations ACI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-sm text-gray-500">
              Total des revenus pour {year}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-lg">Liste des dotations reçues</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoadingRevenues ? (
            <div className="py-10 text-center text-gray-500">
              Chargement des revenus...
            </div>
          ) : filteredRevenues.length === 0 ? (
            <Alert className="bg-blue-50 border-blue-200">
              <ReceiptIcon className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                Aucun revenu n'a été enregistré pour l'année {year}. Utilisez le bouton "Ajouter un revenu" pour commencer.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Source</th>
                    <th className="text-left py-3 px-4 font-medium">Description</th>
                    <th className="text-right py-3 px-4 font-medium">Montant</th>
                    <th className="text-right py-3 px-4 font-medium w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRevenues.map((revenue: any) => (
                    <tr key={revenue.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(revenue.date)}</td>
                      <td className="py-3 px-4">{revenue.source}</td>
                      <td className="py-3 px-4">{revenue.description || "-"}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(revenue.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteClick(revenue.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td colSpan={3} className="py-3 px-4 text-right font-medium">
                      Total
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      {formatCurrency(totalRevenue)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal d'ajout de revenu */}
      <Dialog open={isAddRevenueModalOpen} onOpenChange={setIsAddRevenueModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un revenu</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input placeholder="CPAM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (€)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
                        step="0.01"
                        {...field}
                        value={field.value === 0 ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <Input type="date" className="pl-10" {...field} />
                      </div>
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
                    <FormLabel>Description (optionnel)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Détails supplémentaires sur ce revenu"
                        className="resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <input type="hidden" {...form.register("category")} value="ACI" />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddRevenueModalOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={addRevenueMutation.isPending}
                >
                  {addRevenueMutation.isPending ? "Ajout en cours..." : "Ajouter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Êtes-vous sûr de vouloir supprimer ce revenu ? Cette action ne peut pas être annulée.
          </p>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteRevenueMutation.isPending}
            >
              {deleteRevenueMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}