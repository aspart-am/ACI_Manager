import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Filter, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExpensesTable from "@/components/ui/expenses-table";
import AddExpenseModal from "@/components/modals/add-expense-modal";
import { formatCurrency } from "@/lib/utils";

export default function Expenses() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Fetch expenses data
  const { data: expenses, isLoading } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
  };

  // Calculate expense metrics
  const totalExpenses = expenses?.reduce((total: number, expense: any) => 
    total + parseFloat(expense.amount), 0) || 0;
  
  const fixedExpenses = expenses?.filter((e: any) => 
    e.isRecurring)?.reduce((total: number, expense: any) => 
    total + parseFloat(expense.amount), 0) || 0;
  
  const variableExpenses = totalExpenses - fixedExpenses;
  
  // Group expenses by category
  const expensesByCategory = expenses?.reduce((acc: Record<string, number>, expense: any) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = 0;
    }
    acc[category] += parseFloat(expense.amount);
    return acc;
  }, {}) || {};
  
  // Find top expense categories
  const topCategories = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des charges</h1>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddModalOpen(true)}
        >
          <PlusCircle className="h-4 w-4 mr-2" /> Ajouter une charge
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total des charges</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Charges fixes</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(fixedExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mr-4">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Charges variables</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(variableExpenses)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {topCategories.map(([category, amount], index) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">{formatCurrency(amount)}</div>
              <div className="mt-1 text-xs text-gray-500">
                {Math.round((amount / totalExpenses) * 100)}% du total des charges
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-800">Liste des charges</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Toutes</TabsTrigger>
              <TabsTrigger value="fixed">Charges fixes</TabsTrigger>
              <TabsTrigger value="variable">Charges variables</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <ExpensesTable 
                expenses={expenses || []} 
                isLoading={isLoading}
                filter="all"
              />
            </TabsContent>
            
            <TabsContent value="fixed">
              <ExpensesTable 
                expenses={expenses?.filter((e: any) => e.isRecurring) || []} 
                isLoading={isLoading}
                filter="fixed"
              />
            </TabsContent>
            
            <TabsContent value="variable">
              <ExpensesTable 
                expenses={expenses?.filter((e: any) => !e.isRecurring) || []} 
                isLoading={isLoading}
                filter="variable"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
