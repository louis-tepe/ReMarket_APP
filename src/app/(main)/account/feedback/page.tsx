'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feedbackSchema, TFeedback } from '@/types/feedback';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const feedbackTypes = [
  { value: 'suggestion', label: "Suggestion d'amélioration" },
  { value: 'bug', label: 'Signaler un bug' },
  { value: 'praise', label: 'Donner un avis positif' },
  { value: 'other', label: 'Autre' },
];

export default function FeedbackPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TFeedback>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedbackType: '',
      message: '',
    },
  });

  const onSubmit = async (data: TFeedback) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Une erreur est survenue.');
      }

      toast.success('Merci !', {
        description: 'Votre retour a bien été envoyé.',
      });
      form.reset();
    } catch (error) {
      toast.error("Erreur", {
        description: "Impossible d'envoyer votre retour pour le moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Partagez votre expérience</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="feedbackType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de retour</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {feedbackTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Votre message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez votre expérience, signalez un problème ou laissez-nous une suggestion..."
                        className="resize-none"
                        rows={8}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer mon retour'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 