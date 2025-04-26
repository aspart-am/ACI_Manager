import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';

// Schéma de validation pour le formulaire
export const rcpFormSchema = z.object({
  date: z.string().min(1, { message: 'La date est requise' }),
  title: z.string().min(1, { message: 'Le titre est requis' }),
  description: z.string().optional(),
  duration: z.number().min(15, { message: 'La durée minimale est de 15 minutes' })
});

export type RcpFormValues = z.infer<typeof rcpFormSchema>;

interface RcpMeetingFormProps {
  defaultValues?: RcpFormValues;
  onSubmit: (values: RcpFormValues) => void;
  isSubmitting: boolean;
  submitLabel?: string;
}

export function RcpMeetingForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting, 
  submitLabel = 'Créer la réunion' 
}: RcpMeetingFormProps) {
  const form = useForm<RcpFormValues>({
    resolver: zodResolver(rcpFormSchema),
    defaultValues: defaultValues || {
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      duration: 60,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre</FormLabel>
              <FormControl>
                <Input placeholder="RCP Mensuelle" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Détails de la réunion..." 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durée (minutes)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="15" 
                  step="5" 
                  value={field.value?.toString() || "60"}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 60)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Traitement...' : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}