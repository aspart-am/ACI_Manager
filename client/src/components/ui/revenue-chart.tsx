import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RevenueChartProps {
  revenues: any[];
  isLoading: boolean;
  period?: "monthly" | "quarterly" | "yearly";
}

export default function RevenueChart({
  revenues = [],
  isLoading,
  period = "quarterly"
}: RevenueChartProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "quarterly" | "yearly">(period);

  // Helper function to format date into period
  const formatDateByPeriod = (date: Date) => {
    const month = date.getMonth();
    const year = date.getFullYear();
    
    switch (selectedPeriod) {
      case "monthly":
        return `${month + 1}/${year}`;
      case "quarterly":
        const quarter = Math.floor(month / 3) + 1;
        return `T${quarter}/${year}`;
      case "yearly":
        return `${year}`;
    }
  };
  
  // Group revenues by period
  const prepareChartData = () => {
    if (!revenues || revenues.length === 0) return [];
    
    const aggregatedData: Record<string, { aci: number, other: number }> = {};
    
    revenues.forEach(revenue => {
      const date = new Date(revenue.date);
      const period = formatDateByPeriod(date);
      
      if (!aggregatedData[period]) {
        aggregatedData[period] = { aci: 0, other: 0 };
      }
      
      const amount = parseFloat(revenue.amount);
      if (revenue.category === "ACI") {
        aggregatedData[period].aci += amount;
      } else {
        aggregatedData[period].other += amount;
      }
    });
    
    // Convert to array and sort chronologically
    return Object.entries(aggregatedData)
      .map(([period, amounts]) => ({
        period,
        aci: amounts.aci,
        other: amounts.other,
        total: amounts.aci + amounts.other
      }))
      .sort((a, b) => {
        // Extract year and period for sorting
        const [periodA, yearA] = a.period.split('/');
        const [periodB, yearB] = b.period.split('/');
        
        // Compare years first
        if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
        
        // Then compare periods (months or quarters)
        return periodA.localeCompare(periodB);
      });
  };
  
  const chartData = prepareChartData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p>Aucune donnée de revenus disponible</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
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
          labelFormatter={(name) => `Période: ${name}`}
        />
        <Legend />
        <Bar dataKey="aci" name="ACI" fill="#0063A3" />
        <Bar dataKey="other" name="Autres" fill="#33A8FF" />
      </BarChart>
    </ResponsiveContainer>
  );
}
