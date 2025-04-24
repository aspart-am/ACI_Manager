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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertAssociateSchema } from "@shared/schema";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Extend the insert schema with more specific validations
const formSchema = insertAssociateSchema.extend({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  profession: z.string().min(2, "La profession est requise"),
  joinDate: z.coerce.date({
    required_error: "Veuillez sélectionner une date",
    invalid_type_error: "Date invalide",
  }),
  patientCount: z.coerce.number().int().min(0, "Le nombre de patients ne peut pas être négatif"),
  participationWeight: z.coerce.number().positive("Le poids de participation doit être positif"),
  isManager: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface AssociateFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<FormData>;
  isEdit?: boolean;
  associateId?: number;
}

export default function AssociateForm({
  onSuccess,
  defaultValues = {
    name: "",
    profession: "",
    isManager: false,
    joinDate: new Date(),
    patientCount: 0,
    participationWeight: 1,
  },
  isEdit = false,
  associateId,
}: AssociateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      
      if (isEdit && associateId) {
        // Update existing associate
        await apiRequest("PATCH", `/api/associates/${associateId}`, data);
        toast({
          title: "Associé mis à jour",
          description: "L'associé a été modifié avec succès.",
        });
      } else {
        // Create new associate
        await apiRequest("POST", "/api/associates", data);
        toast({
          title: "Associé ajouté",
          description: "Le nouvel associé a été ajouté avec succès.",
        });
      }
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/associates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/distribution/calculation"] });
      
      // Call the success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      if (!isEdit) {
        // Reset form if adding a new associate
        form.reset(defaultValues);
      }
    } catch (error) {
      console.error("Error submitting associate:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement de l'associé.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom complet</FormLabel>
              <FormControl>
                <Input placeholder="Dr. Jean Dupont" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="profession"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profession</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une profession" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Médecin généraliste">Médecin généraliste</SelectItem>
                  <SelectItem value="Infirmier(e)">Infirmier(e)</SelectItem>
                  <SelectItem value="Kinésithérapeute">Kinésithérapeute</SelectItem>
                  <SelectItem value="Psychologue">Psychologue</SelectItem>
                  <SelectItem value="Diététicien(ne)">Diététicien(ne)</SelectItem>
                  <SelectItem value="Orthophoniste">Orthophoniste</SelectItem>
                  <SelectItem value="Sage-femme">Sage-femme</SelectItem>
                  <SelectItem value="Podologue">Podologue</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="joinDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date d'intégration</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={`w-full pl-3 text-left font-normal ${
                        !field.value ? "text-muted-foreground" : ""
                      }`}
                    >
                      {field.value ? (
                        format(field.value, "P", { locale: fr })
                      ) : (
                        <span>Sélectionner une date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="patientCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre de patients</FormLabel>
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
                <FormDescription>
                  Applicable pour les médecins traitants
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="participationWeight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poids de participation</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value === "" ? undefined : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Coefficient de base pour la répartition (1.0 par défaut)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isManager"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Statut de gérant</FormLabel>
                <FormDescription>
                  Cochez cette case si l'associé a le statut de gérant/cogérant de la MSP.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Ajouter"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
