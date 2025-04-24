import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { 
  CheckCircle2, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Star,
  UserCheck,
  CalendarCheck,
  ClipboardList
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface DistributionItem {
  associateId: number;
  name: string;
  profession: string;
  isManager: boolean;
  weight: number;
  sharePercentage: number;
  amount: number;
}

interface DistributionTableProps {
  distribution: DistributionItem[];
}

export default function DistributionTable({ distribution = [] }: DistributionTableProps) {
  const [sortField, setSortField] = useState<string>("amount");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Handler for changing sort
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Sort the data
  const sortedDistribution = [...distribution].sort((a, b) => {
    const aValue = a[sortField as keyof DistributionItem];
    const bValue = b[sortField as keyof DistributionItem];
    
    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Calculate total amount to distribute
  const totalAmount = distribution.reduce((sum, item) => sum + item.amount, 0);

  if (distribution.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune donnée de répartition disponible.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Associé</TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("weight")}
              >
                <div className="flex items-center">
                  Pondération
                  {sortField === "weight" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => handleSort("sharePercentage")}
              >
                <div className="flex items-center justify-end">
                  Pourcentage
                  {sortField === "sharePercentage" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end">
                  Montant
                  {sortField === "amount" && (
                    sortDirection === "asc" ? 
                    <ChevronUp className="ml-1 h-4 w-4" /> : 
                    <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[80px]">Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDistribution.map((item) => (
              <TableRow key={item.associateId}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8 bg-blue-100 text-blue-600">
                      <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.profession}</div>
                    </div>
                    {item.isManager && (
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        <Star className="mr-1 h-3 w-3" />
                        Gérant
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-medium">×{item.weight.toFixed(1)}</TableCell>
                <TableCell className="text-right">
                  <div className="font-medium">{item.sharePercentage.toFixed(1)}%</div>
                  <Progress value={item.sharePercentage} className="h-1 mt-1" />
                </TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(item.amount)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Facteurs de pondération</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="flex items-center">
                        <UserCheck className="mr-2 h-4 w-4 text-blue-600" />
                        <span>Statut: </span>
                        <span className="ml-auto font-medium">
                          {item.isManager ? "Gérant ×1.5" : "Associé ×1.0"}
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center">
                        <CalendarCheck className="mr-2 h-4 w-4 text-green-600" />
                        <span>Présence RCP: </span>
                        <span className="ml-auto font-medium">
                          100% (12/12)
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="flex items-center">
                        <ClipboardList className="mr-2 h-4 w-4 text-orange-600" />
                        <span>Projets: </span>
                        <span className="ml-auto font-medium">
                          2 projets actifs
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="bg-blue-50 p-3 rounded flex justify-between items-center">
        <span className="font-semibold">Total à répartir:</span>
        <span className="font-bold text-xl">{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}
