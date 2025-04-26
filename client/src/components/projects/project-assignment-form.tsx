import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DialogFooter } from '@/components/ui/dialog';

// Schéma de validation pour le formulaire d'affectation
export const assignmentFormSchema = z.object({
  projectId: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number().min(1)
  ),
  associateId: z.preprocess(
    (val) => parseInt(val as string, 10),
    z.number().min(1, { message: 'Veuillez sélectionner un associé' })
  ),
  contribution: z.string().min(1, { message: 'La contribution est requise' }),
});

export type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface AssignmentFormProps {
  defaultValues: AssignmentFormValues;
  onSubmit: (values: AssignmentFormValues) => void;
  isSubmitting: boolean;
  autoDistribute: boolean;
  setAutoDistribute: (value: boolean) => void;
  associates: any[];
  isAssociateAssignedToProject: (id: number) => boolean;
}

export function ProjectAssignmentForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting, 
  autoDistribute, 
  setAutoDistribute, 
  associates,
  isAssociateAssignedToProject
}: AssignmentFormProps) {
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="associateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Associé</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un associé" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.isArray(associates) && associates
                    .filter((a: any) => !isAssociateAssignedToProject(a.id))
                    .map((associate: any) => (
                      <SelectItem key={associate.id} value={associate.id.toString()}>
                        {associate.name} ({associate.profession})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-distribute"
              checked={autoDistribute}
              onCheckedChange={setAutoDistribute}
            />
            <Label htmlFor="auto-distribute">
              Distribution automatique des contributions
            </Label>
          </div>
          
          <FormField
            control={form.control}
            name="contribution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contribution (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1" 
                    min="0.1" 
                    max="100"
                    {...field}
                    disabled={autoDistribute}
                  />
                </FormControl>
                <FormMessage />
                {autoDistribute && (
                  <p className="text-sm text-muted-foreground">
                    La contribution sera automatiquement calculée pour être équitable
                    entre tous les associés.
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ajout en cours...' : 'Ajouter au projet'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}