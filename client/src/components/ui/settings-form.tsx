import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw, 
  Save, 
  Building, 
  Calendar, 
  BellRing 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define the form schema
const formSchema = z.object({
  mspName: z.string().min(2, "Le nom de la MSP est requis"),
  address: z.string().min(2, "L'adresse est requise"),
  useRCP: z.boolean(),
  useProjects: z.boolean(),
  fiscalYear: z.enum(["calendar", "september", "custom"], {
    required_error: "Veuillez sélectionner un type d'année fiscale",
  }),
  customFiscalYearStart: z.string().optional(),
  enableNotifications: z.boolean(),
  enableEmailReports: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

export default function SettingsForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mspName: "Maison de Santé Pluriprofessionnelle",
      address: "1 rue de la Santé, 75000 Paris",
      useRCP: true,
      useProjects: true,
      fiscalYear: "calendar",
      customFiscalYearStart: "",
      enableNotifications: true,
      enableEmailReports: false,
    },
  });

  const fiscalYear = form.watch("fiscalYear");

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      // This would be a real API call in production
      console.log("Submitting settings:", data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Paramètres enregistrés",
        description: "Les paramètres généraux ont été mis à jour avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement des paramètres.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center mb-4">
                <Building className="mr-2 h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium">Informations de la MSP</h3>
              </div>
              
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="mspName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom de la MSP</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center mb-4">
                <Calendar className="mr-2 h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-medium">Année fiscale</h3>
              </div>
              
              <FormField
                control={form.control}
                name="fiscalYear"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="calendar" id="calendar" />
                          <Label htmlFor="calendar">Année civile (Jan-Déc)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="september" id="september" />
                          <Label htmlFor="september">Sept-Août</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id="custom" />
                          <Label htmlFor="custom">Personnalisée</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {fiscalYear === "custom" && (
                <FormField
                  control={form.control}
                  name="customFiscalYearStart"
                  render={({ field }) => (
                    <FormItem className="mt-3">
                      <FormLabel>Date de début d'année fiscale</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Définissez la date de début de votre année fiscale personnalisée
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center mb-4">
              <BellRing className="mr-2 h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium">Notifications et rapports</h3>
            </div>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="enableNotifications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Notifications</FormLabel>
                      <FormDescription>
                        Recevoir des notifications concernant les revenus, charges et rapports
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="enableEmailReports"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Rapports par email</FormLabel>
                      <FormDescription>
                        Recevoir des rapports mensuels par email concernant la répartition des revenus
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="useRCP"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Réunions RCP</FormLabel>
                      <FormDescription>
                        Utiliser les présences aux RCP dans le calcul de la répartition
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="useProjects"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Projets MSP</FormLabel>
                      <FormDescription>
                        Inclure l'implication dans les projets pour la répartition
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer les paramètres
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
