import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AssociatesTable from "@/components/ui/associates-table";
import AddAssociateModal from "@/components/modals/add-associate-modal";
import { formatDate } from "@/lib/utils";

export default function Associates() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Fetch associates data
  const { data: associates, isLoading } = useQuery({
    queryKey: ["/api/associates"],
  });

  const handleAddSuccess = () => {
    setIsAddModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/associates"] });
  };

  // Count total associates, managers and non-managers
  const totalCount = associates?.length || 0;
  const managersCount = associates?.filter((a: any) => a.isManager || a.is_manager)?.length || 0;
  const nonManagersCount = totalCount - managersCount;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestion des associés</h1>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => setIsAddModalOpen(true)}
        >
          <PlusCircle className="h-4 w-4 mr-2" /> Ajouter un associé
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total associés</p>
              <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Gérants</p>
              <p className="text-2xl font-bold text-gray-800">{managersCount}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 flex items-center">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mr-4">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Associés simples</p>
              <p className="text-2xl font-bold text-gray-800">{nonManagersCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-800">Liste des associés</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="managers">Gérants</TabsTrigger>
              <TabsTrigger value="non-managers">Associés simples</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <AssociatesTable 
                associates={associates || []} 
                isLoading={isLoading}
                filter="all"
              />
            </TabsContent>
            
            <TabsContent value="managers">
              <AssociatesTable 
                associates={associates?.filter((a: any) => a.isManager || a.is_manager) || []} 
                isLoading={isLoading}
                filter="managers"
              />
            </TabsContent>
            
            <TabsContent value="non-managers">
              <AssociatesTable 
                associates={associates?.filter((a: any) => !(a.isManager || a.is_manager)) || []} 
                isLoading={isLoading}
                filter="non-managers"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddAssociateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
