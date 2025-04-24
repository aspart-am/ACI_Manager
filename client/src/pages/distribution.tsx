import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, RefreshCw, Settings, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import RevenueSummaryCards from "@/components/ui/revenue-summary-cards";
import DistributionTable from "@/components/ui/distribution-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import HelpModal from "@/components/modals/help-modal";

export default function Distribution() {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  
  // Fetch distribution calculation
  const { data: distributionData, isLoading: isLoadingDistribution, refetch } = useQuery({
    queryKey: ["/api/distribution/calculation"],
  });

  // Fetch revenues data for summary cards
  const { data: revenues, isLoading: isLoadingRevenues } = useQuery({
    queryKey: ["/api/revenues"],
  });

  // Fetch expenses data for summary cards
  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["/api/expenses"],
  });

  // Fetch settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/settings"],
  });

  const isLoading = isLoadingDistribution || isLoadingRevenues || isLoadingExpenses || isLoadingSettings;

  // Calculate ACI total from revenues
  const aciRevenues = revenues
    ? revenues.filter((revenue: any) => revenue.category === "ACI")
    : [];
  const totalAci = aciRevenues.reduce(
    (sum: number, revenue: any) => sum + parseFloat(revenue.amount),
    0
  );

  // Calculate total expenses
  const totalExpenses = expenses
    ? expenses.reduce(
        (sum: number, expense: any) => sum + parseFloat(expense.amount),
        0
      )
    : 0;

  // Calculate net distribution amount
  const netDistribution = totalAci - totalExpenses;

  // Prepare data for pie chart
  const pieChartData = distributionData?.distribution?.map((item: any) => ({
    name: item.name,
    value: parseFloat(item.amount),
    profession: item.profession,
    isManager: item.isManager
  })) || [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const handleRecalculate = () => {
    refetch();
  };

  // Get settings for descriptions
  const managerWeightSetting = settings?.find((s: any) => s.key === "aci_manager_weight");
  const rcpWeightSetting = settings?.find((s: any) => s.key === "rcp_attendance_weight");
  const projectWeightSetting = settings?.find((s: any) => s.key === "project_contribution_weight");

  const managerWeight = managerWeightSetting ? managerWeightSetting.value : "1.5";
  const rcpWeight = rcpWeightSetting ? rcpWeightSetting.value : "0.8";
  const projectWeight = projectWeightSetting ? projectWeightSetting.value : "1.2";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Répartition des rémunérations</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Recalculer
          </Button>
          <Button
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              // This would generate a report in a real implementation
              alert("Fonctionnalité de téléchargement du rapport à implémenter");
            }}
          >
            <DownloadIcon className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      <RevenueSummaryCards
        aciTotal={totalAci}
        expensesTotal={totalExpenses}
        netDistribution={netDistribution}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium">Répartition actuelle</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:text-blue-800 p-0"
                onClick={() => setIsHelpModalOpen(true)}
              >
                <Info className="h-4 w-4 mr-1" /> Comprendre la répartition
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 mb-4">
              La répartition est calculée selon les paramètres définis dans les réglages et prend en compte
              le statut de gérant, la participation aux réunions (RCP) et l'implication dans les projets.
            </p>
            
            <div className="mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <DistributionTable distribution={distributionData?.distribution || []} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Visualisation</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : pieChartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(name) => `Montant`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-800">Critères de répartition</CardTitle>
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/settings"}>
              <Settings className="h-4 w-4 mr-2" />
              Modifier les paramètres
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Vue générale</TabsTrigger>
              <TabsTrigger value="rcp">Présence RCP</TabsTrigger>
              <TabsTrigger value="projects">Implication projets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Statut de gérant</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-800">×{managerWeight}</div>
                    <p className="mt-2 text-sm text-gray-500">
                      Les gérants bénéficient d'une pondération supplémentaire reflétant leurs responsabilités accrues.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Présence RCP</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-800">×{rcpWeight}</div>
                    <p className="mt-2 text-sm text-gray-500">
                      Pondération appliquée pour la participation aux Réunions de Concertation Pluriprofessionnelle.
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Projets MSP</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-800">×{projectWeight}</div>
                    <p className="mt-2 text-sm text-gray-500">
                      Pondération pour l'implication dans les projets et les tâches accomplies.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="rcp">
              <p className="text-sm text-gray-600 mb-4">
                Cette section présente le détail des présences aux RCP pour chaque associé et leur impact
                sur la répartition des rémunérations (25% du montant total à distribuer).
              </p>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col">
                          <h4 className="text-sm font-medium mb-2">Réunions RCP récentes</h4>
                          {distributionData?.rcpMeetings && distributionData.rcpMeetings.length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durée</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participants</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {distributionData.rcpMeetings.map((meeting: any) => (
                                    <tr key={meeting.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(meeting.date).toLocaleDateString('fr-FR')}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{meeting.title}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{meeting.duration || 60} min</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {meeting.attendanceCount || 0} participants
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Aucune réunion RCP enregistrée. Pour ajouter des réunions, utilisez l'onglet "Réunions RCP".
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col">
                          <h4 className="text-sm font-medium mb-2">Temps de présence par associé</h4>
                          {distributionData?.rcpAttendance && Object.keys(distributionData.rcpAttendance).length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Associé</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Présence (minutes)</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part RCP (%)</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {distributionData.distribution.map((item: any) => (
                                    <tr key={item.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {distributionData.rcpAttendance[item.id]?.minutes || 0} min
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {distributionData.rcpAttendance[item.id]?.percentage 
                                          ? (distributionData.rcpAttendance[item.id].percentage * 100).toFixed(1) + '%' 
                                          : '0%'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(item.rcpShare || 0)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Aucune présence RCP enregistrée. Pour ajouter des présences, utilisez l'onglet "Réunions RCP".
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="projects">
              <p className="text-sm text-gray-600 mb-4">
                Cette section présente le détail des contributions aux projets pour chaque associé et leur impact
                sur la répartition des rémunérations (25% du montant total à distribuer).
              </p>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-[200px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col">
                          <h4 className="text-sm font-medium mb-2">Projets actifs</h4>
                          {distributionData?.projects && distributionData.projects.length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projet</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Poids</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contributeurs</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {distributionData.projects.map((project: any) => (
                                    <tr key={project.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.title}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.status}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{project.weight}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {project.assignmentCount || 0} associés
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Aucun projet actif. Pour ajouter des projets, utilisez l'onglet "Projets".
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col">
                          <h4 className="text-sm font-medium mb-2">Contributions par associé</h4>
                          {distributionData?.projectContributions && Object.keys(distributionData.projectContributions).length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Associé</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projets</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contribution (%)</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {distributionData.distribution.map((item: any) => (
                                    <tr key={item.id}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {distributionData.projectContributions[item.id]?.projectCount || 0}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {distributionData.projectContributions[item.id]?.percentage 
                                          ? (distributionData.projectContributions[item.id].percentage * 100).toFixed(1) + '%' 
                                          : '0%'}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {formatCurrency(item.projectShare || 0)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500 italic">
                              Aucune contribution aux projets enregistrée. Pour ajouter des contributions, utilisez l'onglet "Projets".
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)}
        title="Comprendre la répartition des rémunérations"
        content={
          <>
            <div className="mb-4">
              <h4 className="font-medium text-blue-600 mb-2">Principes de répartition</h4>
              <p className="text-sm text-gray-700 mb-2">
                La dotation ACI (Accord Conventionnel Interprofessionnel) est répartie entre les membres de la MSP en fonction de plusieurs critères :
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-700 mb-2">
                <li>Le statut de gérant</li>
                <li>La présence effective aux RCP (Réunions de Concertation Pluriprofessionnelle)</li>
                <li>L'implication dans les projets de la MSP</li>
              </ul>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-blue-600 mb-2">Calcul de la répartition</h4>
              <p className="text-sm text-gray-700 mb-2">
                1. Le montant total à répartir est calculé en soustrayant les charges du montant ACI perçu.
              </p>
              <p className="text-sm text-gray-700 mb-2">
                2. Chaque associé reçoit une pondération basée sur :
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-700">
                <li>Son poids de participation de base</li>
                <li>Une majoration si l'associé est gérant (×{managerWeight})</li>
                <li>Un facteur lié à sa présence aux RCP (×{rcpWeight})</li>
                <li>Un facteur lié à sa contribution aux projets (×{projectWeight})</li>
              </ul>
              <p className="text-sm text-gray-700 mt-2">
                3. Le montant total est ensuite réparti proportionnellement à la pondération de chaque associé.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600 mb-2">Personnalisation</h4>
              <p className="text-sm text-gray-700">
                Vous pouvez ajuster les facteurs de pondération dans l'onglet Paramètres pour refléter les priorités de votre MSP.
              </p>
            </div>
          </>
        }
      />
    </div>
  );
}
