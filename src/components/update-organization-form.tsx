'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/queries';
import { useOrganization } from '@/hooks/use-organization';
import { organizationsKeys } from '@/queries/keys';

interface UpdateOrganizationFormProps {
  orgId: string;
}

interface FormValues {
  name: string;
}

export default function UpdateOrganizationForm({
  orgId,
}: UpdateOrganizationFormProps) {
  const queryClient = useQueryClient();
  const { data: organization } = useOrganization(orgId);

  const form = useForm<FormValues>({
    defaultValues: { name: organization?.name ?? '' },
  });

  useEffect(() => {
    form.reset({ name: organization?.name ?? '' });
  }, [organization, form]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.organizations.update(orgId, values.name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: organizationsKeys.detail(orgId),
      });
      await fetch('/api/revalidate-tag', {
        method: 'POST',
        body: JSON.stringify({ tag: 'organizations' }),
      });
      setSuccess('Organization updated');
    },
    onError: (err: Error) => setError(err.message),
  });

  function onSubmit(values: FormValues) {
    setError(null);
    setSuccess(null);
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className='text-sm text-red-500'>{error}</p>}
        {success && <p className='text-sm text-green-500'>{success}</p>}
        <Button type='submit' className='w-full' disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
