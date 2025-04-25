import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  Save, 
  RefreshCw, 
  SettingsIcon, 
  UserCog, 
  CalendarClock, 
  ClipboardList,
  AlertCircle
} from "lucide-react";
import SettingsForm from "@/components/ui/settings-form";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Settings() {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Fetch settings data
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
  });

  // Get specific settings
  const getSettingValue = (key: string, defaultValue: string) => {
    const setting = settings?.find((s: any) => s.key === key);
    return setting ? setting.value : defaultValue;
  };

  const managerWeight = parseFloat(getSettingValue("aci_manager_weight", "1.5"));
  const rcpWeight = parseFloat(getSettingValue("rcp_attendance_weight", "0.8"));
  const projectWeight = parseFloat(getSettingValue("project_contribution_weight", "1.2"));

  // Handle settings update
  const handleUpdateWeights = async () => {
    try {
      setIsUpdating(true);
      
      // Utiliser "patch" en minuscules au lieu de "PATCH" pour éviter l'erreur HTTP token
      await apiRequest("patch", `/api/settings/aci_manager_weight`, { value: managerWeight.toString() });
      await apiRequest("patch", `/api/settings/rcp_attendance_weight`, { value: rcpWeight.toString() });
      await apiRequest("patch", `/api/settings/project_contribution_weight`, { value: projectWeight.toString() });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/distribution/calculation"] });
      
      toast({
        title: "Paramètres mis à jour",
        description: "Les facteurs de pondération ont été enregistrés avec succès.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour des paramètres:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour des paramètres.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      // Utiliser "patch" en minuscules au lieu de "PATCH" pour éviter l'erreur HTTP token
      await apiRequest("patch", `/api/settings/${key}`, { value });
      await queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      
      toast({
        title: "Paramètre mis à jour",
        description: `Le paramètre ${key} a été modifié avec succès.`,
        variant: "default",
      });
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du paramètre ${key}:`, error);
      toast({
        title: "Erreur",
        description: `Une erreur est survenue lors de la mise à jour du paramètre ${key}.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Paramètres</h1>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          La modification des facteurs de pondération affectera directement la répartition des rémunérations entre les associés de la MSP.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="distribution" className="space-y-6">
        <TabsList>
          <TabsTrigger value="distribution">Facteurs de répartition</TabsTrigger>
          <TabsTrigger value="general">Paramètres généraux</TabsTrigger>
          <TabsTrigger value="backup">Sauvegarde et export</TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Facteurs de pondération</CardTitle>
              <CardDescription>
                Définissez les facteurs qui impactent la répartition des rémunérations entre les associés.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                  <div className="h-12 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Facteur cogérant</Label>
                        <p className="text-sm text-muted-foreground">
                          Pondération appliquée aux associés ayant le statut de gérant
                        </p>
                      </div>
                      <span className="font-bold text-lg">×{managerWeight.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[managerWeight * 10]}
                      min={5}
                      max={30}
                      step={1}
                      className="w-full"
                      onValueChange={(value) => {
                        updateSetting("aci_manager_weight", (value[0] / 10).toString());
                      }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>×0.5</span>
                      <span>×3.0</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Facteur présence RCP</Label>
                        <p className="text-sm text-muted-foreground">
                          Pondération pour la présence aux Réunions de Concertation Pluriprofessionnelle
                        </p>
                      </div>
                      <span className="font-bold text-lg">×{rcpWeight.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[rcpWeight * 10]}
                      min={0}
                      max={20}
                      step={1}
                      className="w-full"
                      onValueChange={(value) => {
                        updateSetting("rcp_attendance_weight", (value[0] / 10).toString());
                      }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>×0.0</span>
                      <span>×2.0</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Facteur projet</Label>
                        <p className="text-sm text-muted-foreground">
                          Pondération pour l'implication dans les projets et tâches de la MSP
                        </p>
                      </div>
                      <span className="font-bold text-lg">×{projectWeight.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[projectWeight * 10]}
                      min={0}
                      max={30}
                      step={1}
                      className="w-full"
                      onValueChange={(value) => {
                        updateSetting("project_contribution_weight", (value[0] / 10).toString());
                      }}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>×0.0</span>
                      <span>×3.0</span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button 
                      onClick={handleUpdateWeights}
                      disabled={isUpdating}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isUpdating ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Mise à jour...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Enregistrer les modifications
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <UserCog className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Cogérants</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Les cogérants bénéficient d'une pondération supplémentaire reflétant leurs responsabilités
                  de gestion de la MSP, leurs tâches administratives, et leur implication dans le développement de la structure.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Définissez ce facteur en fonction de l'équilibre souhaité entre gérants et associés simples.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <CalendarClock className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">RCP</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  La présence aux Réunions de Concertation Pluriprofessionnelle est essentielle au 
                  fonctionnement de la MSP et à la coordination des soins.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Valorisez la participation régulière des associés à ces réunions en ajustant ce facteur.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Projets</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  L'implication dans les projets de la MSP (prévention, éducation thérapeutique, coordination...)
                  contribue directement à la qualité des soins et aux objectifs de l'ACI.
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Ajustez ce facteur pour encourager la participation active aux projets de la structure.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres généraux</CardTitle>
              <CardDescription>
                Configuration générale de l'application MSP Gestion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card>
            <CardHeader>
              <CardTitle>Sauvegarde et export</CardTitle>
              <CardDescription>
                Sauvegardez vos données ou exportez-les pour analyse externe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-md">
                  <div className="flex items-center mb-2">
                    <SettingsIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium">Exporter les données</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Exportez toutes les données de la MSP au format Excel ou CSV pour analyse externe.
                  </p>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">Excel</Button>
                    <Button variant="outline" size="sm">CSV</Button>
                  </div>
                </div>
                
                <div className="p-4 border rounded-md">
                  <div className="flex items-center mb-2">
                    <SettingsIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <h3 className="font-medium">Sauvegarde complète</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Créez une sauvegarde complète de toutes les données de votre MSP.
                  </p>
                  <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Créer une sauvegarde
                  </Button>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium mb-2">Sauvegardes précédentes</h3>
                <div className="bg-gray-50 p-4 rounded-md text-center text-gray-500">
                  Aucune sauvegarde disponible
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
