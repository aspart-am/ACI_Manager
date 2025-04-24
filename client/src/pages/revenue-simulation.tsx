import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InfoIcon } from "lucide-react";
import RevenueTable from "@/components/ui/revenue-table";
import RevenueForm from "@/components/ui/revenue-form";
import RevenueChart from "@/components/ui/revenue-chart";
import RevenueSummaryCards from "@/components/ui/revenue-summary-cards";
import HelpModal from "@/components/modals/help-modal";
import AddRevenueModal from "@/components/modals/add-revenue-modal";

export default function RevenueSimulation() {
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAddRevenueModalOpen, setIsAddRevenueModalOpen] = useState(false);

  // Fetch revenues data
  const { data: revenues, isLoading: isLoadingRevenues } = useQuery({
    queryKey: ["/api/revenues"],
  });

  // Fetch expenses data for summary cards
  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ["/api/expenses"],
  });

  const isLoading = isLoadingRevenues || isLoadingExpenses;

  // Filter revenues by year
  const filteredRevenues = revenues
    ? revenues.filter(
        (revenue: any) => new Date(revenue.date).getFullYear() === year
      )
    : [];

  // Calculate totals for ACI revenue
  const aciRevenues = filteredRevenues.filter(
    (revenue: any) => revenue.category === "ACI"
  );
  const totalAci = aciRevenues.reduce(
    (sum: number, revenue: any) => sum + parseFloat(revenue.amount),
    0
  );

  // Calculate total actual revenue received
  const totalActualRevenue = filteredRevenues.reduce(
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

  // Calculate amount remaining to be received
  const estimatedAciTotal = 76500; // This would normally be calculated or fetched
  const remainingToReceive = estimatedAciTotal - totalAci;

  // ACI indicators data
  const aciIndicators = [
    {
      id: 1,
      name: "Socle (fixe)",
      description: "Montant fixe par patient médecin traitant",
      target: "-",
      result: "2950 patients",
      amount: 29500,
    },
    {
      id: 2,
      name: "Axe 1",
      description: "Accès aux soins",
      target: "15 pts",
      result: 13,
      amount: 13000,
    },
    {
      id: 3,
      name: "Axe 2",
      description: "Travail en équipe",
      target: "25 pts",
      result: 20,
      amount: 20000,
    },
    {
      id: 4,
      name: "Axe 3",
      description: "Système d'information",
      target: "20 pts",
      result: 14,
      amount: 14000,
    },
  ];

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setYear(parseInt(e.target.value));
  };

  const handleAddRevenue = () => {
    setIsAddRevenueModalOpen(true);
  };

  const handleAddRevenueSuccess = () => {
    setIsAddRevenueModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ["/api/revenues"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Simulation des revenus</h1>
        <div>
          <select
            className="border border-gray-300 rounded px-3 py-2 bg-white text-gray-700"
            value={year}
            onChange={handleYearChange}
          >
            <option value={2023}>Année 2023</option>
            <option value={2024}>Année 2024</option>
            <option value={2025}>Année 2025</option>
          </select>
        </div>
      </div>

      <RevenueSummaryCards
        aciTotal={totalAci}
        expensesTotal={totalExpenses}
        netDistribution={netDistribution}
        isLoading={isLoading}
      />

      <Card className="bg-white rounded-lg shadow mb-8">
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-800">Saisie des revenus</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <h3 className="text-md font-medium text-gray-700 mr-2">Source de revenus ACI</h3>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:text-blue-800 p-0"
                onClick={() => setIsHelpModalOpen(true)}
              >
                <InfoIcon className="h-4 w-4 mr-1" /> Aide
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Indicateur</th>
                    <th className="text-left p-3 text-sm font-semibold text-gray-700">Description</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Objectif</th>
                    <th className="text-center p-3 text-sm font-semibold text-gray-700">Résultat</th>
                    <th className="text-right p-3 text-sm font-semibold text-gray-700">Montant estimé</th>
                  </tr>
                </thead>
                <tbody>
                  {aciIndicators.map((indicator) => (
                    <tr key={indicator.id} className="border-b border-gray-200">
                      <td className="p-3 text-sm">{indicator.name}</td>
                      <td className="p-3 text-sm text-gray-600">{indicator.description}</td>
                      <td className="p-3 text-center text-sm">{indicator.target}</td>
                      <td className="p-3 text-center text-sm">
                        {indicator.id === 1 ? (
                          indicator.result
                        ) : (
                          <input
                            type="number"
                            value={indicator.result as number}
                            min="0"
                            max={parseInt(indicator.target)}
                            className="border border-gray-300 rounded w-16 p-1 text-center mx-auto block"
                          />
                        )}
                      </td>
                      <td className="p-3 text-right text-sm font-medium">{formatCurrency(indicator.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="p-3 text-right font-semibold">Total estimé :</td>
                    <td className="p-3 text-right font-bold">{formatCurrency(estimatedAciTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-medium text-gray-700">Revenus réels perçus</h3>
              <Button
                variant="default"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleAddRevenue}
              >
                + Ajouter
              </Button>
            </div>

            <RevenueTable revenues={filteredRevenues} isLoading={isLoadingRevenues} />

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded p-3 flex justify-between items-center">
                <span className="font-semibold">Total perçu :</span>
                <span className="font-bold">{formatCurrency(totalActualRevenue)}</span>
              </div>
              <div className="bg-gray-50 rounded p-3 flex justify-between items-center">
                <span className="font-semibold">Reste à percevoir :</span>
                <span className="font-medium">{formatCurrency(remainingToReceive)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" className="mr-2">
              Annuler
            </Button>
            <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
              Enregistrer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white rounded-lg shadow">
        <CardHeader className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <CardTitle className="text-lg font-semibold text-gray-800">Évolution des revenus</CardTitle>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
            >
              Mensuel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-sm bg-blue-50 border-blue-600 text-blue-600"
            >
              Trimestriel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
            >
              Annuel
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-64">
            <RevenueChart revenues={filteredRevenues} isLoading={isLoadingRevenues} />
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <HelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)}
        title="Aide - Comprendre la dotation ACI"
        content={
          <>
            <div className="mb-4">
              <h4 className="font-medium text-blue-600 mb-2">Qu'est-ce que la dotation ACI ?</h4>
              <p className="text-sm text-gray-700 mb-2">
                L'Accord Conventionnel Interprofessionnel (ACI) est un financement versé aux Maisons de Santé Pluriprofessionnelles (MSP) par l'Assurance Maladie.
              </p>
              <p className="text-sm text-gray-700">
                Ce financement est calculé sur la base d'indicateurs répartis en 3 axes, plus une part fixe basée sur la patientèle médecin traitant.
              </p>
            </div>
            
            <div className="mb-4">
              <h4 className="font-medium text-blue-600 mb-2">Comment est calculée la rémunération ?</h4>
              <p className="text-sm text-gray-700 mb-2">
                1. <strong>Socle</strong> : Montant fixe par patient (médecin traitant) de la MSP (7-12€ par patient selon le statut ZAC/non-ZAC)
              </p>
              <p className="text-sm text-gray-700 mb-2">
                2. <strong>Axe 1 - Accès aux soins</strong> : Horaires d'ouverture, accès aux soins non programmés, diversité des professions...
              </p>
              <p className="text-sm text-gray-700 mb-2">
                3. <strong>Axe 2 - Travail en équipe</strong> : Concertation pluriprofessionnelle, protocoles de prise en charge, coordination externe...
              </p>
              <p className="text-sm text-gray-700">
                4. <strong>Axe 3 - Système d'information</strong> : Utilisation d'un système d'information partagé, messagerie sécurisée...
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-600 mb-2">Points importants à retenir</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700">
                <li className="mb-1">La rémunération est versée trimestriellement (25% chaque trimestre)</li>
                <li className="mb-1">Les indicateurs sont évalués annuellement</li>
                <li className="mb-1">La valeur du point est fixée à 1000€</li>
                <li className="mb-1">Les MSP en zone sous-dense (ZIP/ZAC) bénéficient d'une majoration</li>
                <li>Les indicateurs facultatifs non remplis ne sont pas pénalisants</li>
              </ul>
            </div>
          </>
        }
      />

      <AddRevenueModal
        isOpen={isAddRevenueModalOpen}
        onClose={() => setIsAddRevenueModalOpen(false)}
        onSuccess={handleAddRevenueSuccess}
      />
    </div>
  );
}
