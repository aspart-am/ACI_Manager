import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RevenueSummaryCards from "@/components/ui/revenue-summary-cards";
import { calculateTotal, formatCurrency, getPercentage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { PieChart, BarChart4, CalendarClock, Users, FileSpreadsheet } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartPieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function Dashboard() {
  // Fetch revenue data
  const { data: revenuesData, isLoading: isLoadingRevenues } = useQuery({
    queryKey: ["/api/revenues"],
  });

  // Fetch expenses data
  const { data: expensesData, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["/api/expenses"],
  });

  // Fetch associates data
  const { data: associatesData, isLoading: isLoadingAssociates } = useQuery({
    queryKey: ["/api/associates"],
  });

  // Fetch distribution calculation
  const { data: distributionData, isLoading: isLoadingDistribution } = useQuery({
    queryKey: ["/api/distribution/calculation"],
  });

  const isLoading = isLoadingRevenues || isLoadingExpenses || isLoadingAssociates || isLoadingDistribution;

  // Calculate totals for summary cards
  const totalRevenues = revenuesData ? calculateTotal(revenuesData) : 0;
  const aciRevenues = revenuesData
    ? revenuesData.filter((rev: any) => rev.category === "ACI")
    : [];
  const totalAci = aciRevenues ? calculateTotal(aciRevenues) : 0;
  const totalExpenses = expensesData ? calculateTotal(expensesData) : 0;
  const netDistribution = totalAci - totalExpenses;

  // Prepare data for expense pie chart
  const expensesByCategory = expensesData
    ? Array.from(
        expensesData.reduce((acc: Map<string, number>, expense: any) => {
          const currentTotal = acc.get(expense.category) || 0;
          acc.set(expense.category, currentTotal + parseFloat(expense.amount));
          return acc;
        }, new Map())
      ).map(([category, amount]) => ({
        name: category,
        value: amount,
      }))
    : [];

  // Prepare data for revenue bar chart by quarter
  const revenueByQuarter = revenuesData
    ? Array.from(
        revenuesData.reduce((acc: Map<string, number>, revenue: any) => {
          const date = new Date(revenue.date);
          const quarter = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
          const currentTotal = acc.get(quarter) || 0;
          acc.set(quarter, currentTotal + parseFloat(revenue.amount));
          return acc;
        }, new Map())
      )
        .map(([quarter, amount]) => ({
          quarter,
          amount,
        }))
        .sort((a, b) => {
          const [q1, y1] = a.quarter.split(" ");
          const [q2, y2] = b.quarter.split(" ");
          return y1 === y2
            ? q1.substring(1) > q2.substring(1)
              ? 1
              : -1
            : y1 > y2
            ? 1
            : -1;
        })
    : [];

  // Colors for the pie chart
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6666"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>

      <RevenueSummaryCards
        aciTotal={totalAci}
        expensesTotal={totalExpenses}
        netDistribution={netDistribution}
        isLoading={isLoading}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue générale</TabsTrigger>
          <TabsTrigger value="finance">Finances</TabsTrigger>
          <TabsTrigger value="associates">Associés</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">Répartition des charges</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingExpenses ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0063A3]"></div>
                  </div>
                ) : expensesByCategory.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartPieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {expensesByCategory.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                      </RechartPieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Aucune donnée disponible
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">Revenus par trimestre</CardTitle>
                  <BarChart4 className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRevenues ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0063A3]"></div>
                  </div>
                ) : revenueByQuarter.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByQuarter}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="quarter" />
                        <YAxis
                          tickFormatter={(value) =>
                            new Intl.NumberFormat("fr", {
                              notation: "compact",
                              compactDisplay: "short",
                            }).format(value)
                          }
                        />
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar
                          dataKey="amount"
                          name="Montant"
                          fill="#0063A3"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Prochaines réunions</CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-12 bg-gray-200 rounded"></div>
                      <div className="h-12 bg-gray-200 rounded"></div>
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-center py-4">
                      Aucune réunion planifiée
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Associés</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingAssociates ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ) : associatesData && associatesData.length > 0 ? (
                  <div className="space-y-4">
                    {associatesData.slice(0, 5).map((associate: any) => (
                      <div key={associate.id} className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full bg-[#EBF4FF] flex items-center justify-center text-[#0063A3]">
                          {associate.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{associate.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {associate.profession}
                          </p>
                        </div>
                        {associate.isManager && (
                          <span className="ml-auto text-xs bg-[#EBF4FF] text-[#0063A3] py-1 px-2 rounded">
                            Gérant
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center py-4">
                    Aucun associé trouvé
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Répartition actuelle</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingDistribution ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                ) : distributionData?.distribution ? (
                  <div className="space-y-4">
                    {distributionData.distribution.slice(0, 5).map((item: any) => (
                      <div key={item.associateId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.name}</span>
                          <span className="font-medium">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#0063A3] h-2 rounded-full"
                            style={{ width: `${item.sharePercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center py-4">
                    Aucune répartition calculée
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6">
          {/* Finance-specific content would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Détails financiers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cette section affichera des informations financières détaillées.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="associates" className="space-y-6">
          {/* Associates-specific content would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Détails des associés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cette section affichera des informations détaillées sur les associés.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
