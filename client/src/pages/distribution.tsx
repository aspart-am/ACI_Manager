import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, RefreshCw, Settings, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import RevenueSummaryCards from "@/components/ui/revenue-summary-cards";
import DistributionTable from "@/components/ui/distribution-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import HelpModal from "@/components/modals/help-modal";

// Définir une interface pour les types de données
interface AssociateShare {
  associateId: number;
  associateName: string;
  profession: string;
  isManager: boolean;
  baseShare: number;
  rcpShare: number;
  projectShare: number;
  totalShare: number;
  percentageShare: number;
}

interface RcpMeeting {
  id: number;
  title: string;
  description: string | null;
  date: string;
  duration: number;
  attendanceCount: number;
}

interface Project {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  weight: string;
  assignmentCount: number;
}

interface AttendanceRecord {
  minutes: number;
  percentage: number;
}

interface ProjectContribution {
  projectCount: number;
  percentage: number;
}

interface DistributionData {
  totalAciRevenue: number;
  totalRevenue: number;
  associateShares: AssociateShare[];
  rcpMeetings: RcpMeeting[];
  projects: Project[];
  rcpAttendance: Record<string, AttendanceRecord>;
  projectContributions: Record<string, ProjectContribution>;
}

export default function Distribution() {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  
  // Fetch distribution calculation
  const { data: distributionData, isLoading: isLoadingDistribution, refetch } = useQuery<DistributionData>({
    queryKey: ["/api/distribution/calculation", selectedYear],
    queryFn: () => fetch(`/api/distribution/calculation?year=${selectedYear}`).then(res => res.json()),
  });

  // Fetch revenues data for summary cards
  const { data: revenues, isLoading: isLoadingRevenues } = useQuery({
    queryKey: ["/api/revenues", selectedYear],
    queryFn: () => fetch(`/api/revenues?year=${selectedYear}`).then(res => res.json()),
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

  // Adapter les données pour le composant DistributionTable
  const formattedDistribution = distributionData?.associateShares?.map((item: any) => ({
    associateId: item.associateId,
    name: item.associateName,
    profession: item.profession,
    isManager: item.isManager || false,
    weight: 1, // Valeur par défaut si nécessaire
    sharePercentage: item.percentageShare * 100,
    amount: item.totalShare
  })) || [];

  // Prepare data for pie chart
  const pieChartData = distributionData?.associateShares?.map((item: any) => ({
    name: item.associateName,
    value: parseFloat(item.totalShare),
    profession: item.profession,
    isManager: item.isManager
  })) || [];
  
  // Prepare data for bar chart - distribution breakdown by associate
  const barChartData = distributionData?.associateShares?.map((item: any) => ({
    name: item.associateName.split(' ')[0], // Prendre juste le prénom pour l'axe X
    base: parseFloat(item.baseShare),
    rcp: parseFloat(item.rcpShare),
    projet: parseFloat(item.projectShare),
    total: parseFloat(item.totalShare)
  })) || [];
  
  // Sort bar chart data by total amount descending
  barChartData.sort((a, b) => b.total - a.total);
  
  // Garder tous les associés pour la visualisation complète
  const allAssociatesData = barChartData;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Fonction pour forcer un recalcul complet de la distribution
  const handleRecalculate = () => {
    setIsRefreshing(true);
    
    // Invalider toutes les données qui pourraient affecter le calcul de distribution
    queryClient.invalidateQueries({ queryKey: ['/api/associates'] }); 
    queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    queryClient.invalidateQueries({ queryKey: ['/api/revenues'] });
    queryClient.invalidateQueries({ queryKey: ['/api/rcp-meetings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    
    // Forcer un recalcul complet avec fetchQuery au lieu de refetch
    setTimeout(async () => {
      try {
        // Forcer un fetch complet plutôt qu'une simple invalidation
        await queryClient.fetchQuery({ 
          queryKey: ['/api/distribution/calculation', selectedYear],
          staleTime: 0 
        });
        
        // Puis refetch la donnée dans le composant
        await refetch();
        
        setIsRefreshing(false);
        toast({
          title: 'Calcul mis à jour',
          description: 'La distribution a été recalculée avec les dernières données.',
        });
      } catch (error) {
        setIsRefreshing(false);
        toast({
          title: 'Erreur',
          description: 'Impossible de recalculer la distribution.',
          variant: 'destructive',
        });
        console.error('Erreur lors du recalcul:', error);
      }
    }, 500);
  };

  // Get settings for descriptions
  const managerWeightSetting = settings?.find((s: any) => s.key === "aci_manager_weight");
  const rcpWeightSetting = settings?.find((s: any) => s.key === "rcp_attendance_weight");
  const projectWeightSetting = settings?.find((s: any) => s.key === "project_contribution_weight");
  const fixedRevenueShareSetting = settings?.find((s: any) => s.key === "fixed_revenue_share");

  const managerWeight = managerWeightSetting ? managerWeightSetting.value : "1.5";
  const rcpWeight = rcpWeightSetting ? rcpWeightSetting.value : "0.8";
  const projectWeight = projectWeightSetting ? projectWeightSetting.value : "1.2";
  const fixedRevenueShare = fixedRevenueShareSetting ? fixedRevenueShareSetting.value : "0.5";
  
  // Automatiquement recalculer la distribution lorsque les paramètres changent
  useEffect(() => {
    if (managerWeightSetting || rcpWeightSetting || projectWeightSetting || fixedRevenueShareSetting) {
      refetch();
    }
  }, [managerWeight, rcpWeight, projectWeight, fixedRevenueShare, refetch]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Répartition des rémunérations</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-700"
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                // Déclenchera automatiquement une requête via useQuery
              }}
            >
              {[2023, 2024, 2025, 2026, 2027].map((year) => (
                <option key={year} value={year}>
                  Année {year}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={handleRecalculate}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span>Recalcul...</span>
              </div>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Recalculer
              </>
            )}
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

      <Card className="mb-6">
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
              <DistributionTable distribution={formattedDistribution} />
            )}
          </div>
        </CardContent>
      </Card>

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
          <Tabs defaultValue="distribution" className="space-y-4">
            <TabsList>
              <TabsTrigger value="distribution">Répartition</TabsTrigger>
              <TabsTrigger value="rcp">Présence RCP</TabsTrigger>
              <TabsTrigger value="projects">Implication projets</TabsTrigger>
            </TabsList>
            
            <TabsContent value="distribution">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Ce graphique présente la répartition des rémunérations pour les associés, 
                  ventilée par type de contribution (part fixe, présence RCP, et implication dans les projets).
                </p>
                
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : allAssociatesData.length > 0 ? (
                  <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={allAssociatesData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                        barSize={15}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          angle={-45} 
                          textAnchor="end"
                          height={80}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `${value.toLocaleString('fr-FR')} €`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toLocaleString('fr-FR')} €`, ""]}
                          labelFormatter={(name) => `Associé: ${name}`}
                        />
                        <Legend
                          verticalAlign="top"
                          wrapperStyle={{ paddingBottom: "10px" }}
                        />
                        <Bar 
                          dataKey="base" 
                          name="Part fixe (50%)" 
                          stackId="a" 
                          fill="#0063A3" 
                        />
                        <Bar 
                          dataKey="rcp" 
                          name="Part RCP (25%)" 
                          stackId="a" 
                          fill="#00A3D9" 
                        />
                        <Bar 
                          dataKey="projet" 
                          name="Part Projets (25%)" 
                          stackId="a" 
                          fill="#00E396" 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
                
                <div className="flex justify-between items-center mt-8 mb-4">
                  <h3 className="text-lg font-semibold">Paramètres actuels</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Part fixe</h4>
                          <p className="text-sm text-gray-500">Du revenu net</p>
                        </div>
                        <span className="text-lg font-bold">{(100 - (Number(rcpWeight)/4*100) - (Number(projectWeight)/4*100)).toFixed(0)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Facteur cogérant</h4>
                          <p className="text-sm text-gray-500">Associés gérants</p>
                        </div>
                        <span className="text-lg font-bold">×{managerWeight}</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Part RCP</h4>
                          <p className="text-sm text-gray-500">Du revenu net</p>
                        </div>
                        <span className="text-lg font-bold">{(Number(rcpWeight)/4*100).toFixed(0)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Part Projets</h4>
                          <p className="text-sm text-gray-500">Du revenu net</p>
                        </div>
                        <span className="text-lg font-bold">{(Number(projectWeight)/4*100).toFixed(0)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="rcp">
              <p className="text-sm text-gray-600 mb-4">
                Cette section présente le détail des présences aux RCP pour chaque associé et leur impact
                sur la rémunération. Les pourcentages de présence sont calculés en fonction de la durée totale
                des réunions auxquelles l'associé a assisté.
              </p>
            
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-md border">
                    <div className="relative w-full overflow-auto">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="bg-gray-100">
                          <tr className="border-b transition-colors">
                            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Associé</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Profession</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-gray-700">Minutes présent</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-gray-700">% présence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {formattedDistribution.map((associate) => {
                            const attendanceRecord = distributionData?.rcpAttendance[associate.associateId];
                            return (
                              <tr
                                key={associate.associateId}
                                className="border-b transition-colors hover:bg-blue-50"
                              >
                                <td className="p-4 align-middle">{associate.name}</td>
                                <td className="p-4 align-middle">{associate.profession}</td>
                                <td className="p-4 align-middle text-right">
                                  {attendanceRecord ? attendanceRecord.minutes : '0'}
                                </td>
                                <td className="p-4 align-middle text-right">
                                  {attendanceRecord ? `${(attendanceRecord.percentage * 100).toFixed(1)}%` : '0%'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {distributionData?.rcpMeetings && distributionData.rcpMeetings.length > 0 ? (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Réunions RCP comptabilisées</h3>
                      <div className="rounded-md border">
                        <div className="relative w-full overflow-auto">
                          <table className="w-full caption-bottom text-sm">
                            <thead className="bg-gray-100">
                              <tr className="border-b transition-colors">
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Date</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Titre</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-gray-700">Durée (min)</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-gray-700">Participants</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {distributionData.rcpMeetings.map((meeting) => (
                                <tr
                                  key={meeting.id}
                                  className="border-b transition-colors hover:bg-blue-50"
                                >
                                  <td className="p-4 align-middle">{new Date(meeting.date).toLocaleDateString('fr-FR')}</td>
                                  <td className="p-4 align-middle">{meeting.title}</td>
                                  <td className="p-4 align-middle text-right">{meeting.duration}</td>
                                  <td className="p-4 align-middle text-right">{meeting.attendanceCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Aucune réunion RCP enregistrée. Pour ajouter des réunions, utilisez l'onglet "Réunions RCP".
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="projects">
              <p className="text-sm text-gray-600 mb-4">
                Cette section présente le détail de l'implication dans les projets pour chaque associé et son impact
                sur la rémunération. Les contributions sont calculées selon le nombre de projets auxquels participe 
                l'associé et leur poids respectif.
              </p>
              
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-md border">
                    <div className="relative w-full overflow-auto">
                      <table className="w-full caption-bottom text-sm">
                        <thead className="bg-gray-100">
                          <tr className="border-b transition-colors">
                            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Associé</th>
                            <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Profession</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-gray-700">Projets</th>
                            <th className="h-12 px-4 text-right align-middle font-medium text-gray-700">% contribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {formattedDistribution.map((associate) => {
                            const projectRecord = distributionData?.projectContributions[associate.associateId];
                            return (
                              <tr
                                key={associate.associateId}
                                className="border-b transition-colors hover:bg-blue-50"
                              >
                                <td className="p-4 align-middle">{associate.name}</td>
                                <td className="p-4 align-middle">{associate.profession}</td>
                                <td className="p-4 align-middle text-right">
                                  {projectRecord ? projectRecord.projectCount : '0'}
                                </td>
                                <td className="p-4 align-middle text-right">
                                  {projectRecord ? `${(projectRecord.percentage * 100).toFixed(1)}%` : '0%'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {distributionData?.projects && distributionData.projects.length > 0 ? (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Projets en cours</h3>
                      <div className="rounded-md border">
                        <div className="relative w-full overflow-auto">
                          <table className="w-full caption-bottom text-sm">
                            <thead className="bg-gray-100">
                              <tr className="border-b transition-colors">
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Titre</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-gray-700">Statut</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-gray-700">Facteur poids</th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-gray-700">Participants</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {distributionData.projects.map((project) => (
                                <tr
                                  key={project.id}
                                  className="border-b transition-colors hover:bg-blue-50"
                                >
                                  <td className="p-4 align-middle">{project.title}</td>
                                  <td className="p-4 align-middle">
                                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium
                                      ${project.status === 'actif' ? 'bg-green-100 text-green-800' : 
                                        project.status === 'terminé' ? 'bg-gray-100 text-gray-800' : 
                                        'bg-yellow-100 text-yellow-800'}`}
                                    >
                                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                    </span>
                                  </td>
                                  <td className="p-4 align-middle text-right">×{project.weight}</td>
                                  <td className="p-4 align-middle text-right">{project.assignmentCount}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">
                      Aucune contribution aux projets enregistrée. Pour ajouter des contributions, utilisez l'onglet "Projets".
                    </div>
                  )}
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