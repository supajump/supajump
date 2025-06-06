'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
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

interface FormValues {
  orgName: string;
  teamName: string;
}

export default function OnboardingForm() {
  const router = useRouter();
  const form = useForm<FormValues>({
    defaultValues: { orgName: '', teamName: '' },
  });

  async function onSubmit(values: FormValues) {
    const supabase = createClient();

    const { data: newOrgId, error: orgError } = await supabase.rpc(
      'create_organization_and_add_current_user_as_owner',
      {
        name: values.orgName,
      }
    );
    if (orgError || !newOrgId) {
      console.error(orgError);
      return;
    }

    const { data: newTeamId, error: teamError } = await supabase.rpc(
      'create_team_and_add_current_user_as_owner',
      {
        team_name: values.teamName,
        org_id: newOrgId,
      }
    );
    if (teamError || !newTeamId) {
      console.error(teamError);
      return;
    }

    router.push(`/app/${newOrgId}/${newTeamId}/dashboard`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='orgName'
          rules={{ required: 'Organization name is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input placeholder='My Organization' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='teamName'
          rules={{ required: 'Team name is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder='My Team' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' className='w-full'>
          Create Organization and Team
        </Button>
      </form>
    </Form>
  );
}
