import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PieChart, HandCoins, Coins } from "lucide-react";

interface RevenueSummaryCardsProps {
  aciTotal: number;
  expensesTotal: number;
  netDistribution: number;
  previousYearAci?: number;
  previousYearExpenses?: number;
  previousYearNet?: number;
  isLoading?: boolean;
}

export default function RevenueSummaryCards({
  aciTotal,
  expensesTotal,
  netDistribution,
  previousYearAci,
  previousYearExpenses,
  previousYearNet,
  isLoading = false,
}: RevenueSummaryCardsProps) {
  const getPercentageChange = (current: number, previous?: number) => {
    if (!previous) return null;
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10; // Round to 1 decimal place
  };

  const aciChange = getPercentageChange(aciTotal, previousYearAci);
  const expensesChange = getPercentageChange(expensesTotal, previousYearExpenses);
  const netChange = getPercentageChange(netDistribution, previousYearNet);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white rounded-lg shadow">
            <CardContent className="p-4">
              <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-white rounded-lg shadow">
        <CardContent className="p-4">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 rounded-full bg-[#EBF4FF] flex items-center justify-center text-[#0063A3] mr-3">
              <PieChart className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-700">Dotation ACI</h3>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-2xl font-bold text-[#0063A3]">{formatCurrency(aciTotal)}</div>
            {aciChange !== null && (
              <div className={`text-xs flex items-center ${aciChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{aciChange >= 0 ? '↑' : '↓'}</span>
                {Math.abs(aciChange)}% vs année précédente
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-lg shadow">
        <CardContent className="p-4">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 rounded-full bg-[#EBF4FF] flex items-center justify-center text-[#0063A3] mr-3">
              <HandCoins className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-700">Total des charges</h3>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-2xl font-bold text-[#0063A3]">{formatCurrency(expensesTotal)}</div>
            {expensesChange !== null && (
              <div className={`text-xs flex items-center ${expensesChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{expensesChange >= 0 ? '↑' : '↓'}</span>
                {Math.abs(expensesChange)}% vs année précédente
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-lg shadow">
        <CardContent className="p-4">
          <div className="flex items-center mb-2">
            <div className="w-10 h-10 rounded-full bg-[#EBF4FF] flex items-center justify-center text-[#0063A3] mr-3">
              <Coins className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-gray-700">Net à répartir</h3>
          </div>
          <div className="flex justify-between items-end">
            <div className="text-2xl font-bold text-[#0063A3]">{formatCurrency(netDistribution)}</div>
            {netChange !== null && (
              <div className={`text-xs flex items-center ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span className="mr-1">{netChange >= 0 ? '↑' : '↓'}</span>
                {Math.abs(netChange)}% vs année précédente
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
