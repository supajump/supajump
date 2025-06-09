'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/queries'

interface FormValues {
  orgName: string
  teamName: string
}

export default function OnboardingForm() {
  const router = useRouter()
  const form = useForm<FormValues>({
    defaultValues: { orgName: '', teamName: '' },
  })
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      api.organizations.createWithTeam(values.orgName, values.teamName),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ['organizations'] })
      await fetch('/api/revalidate-tag', {
        method: 'POST',
        body: JSON.stringify({ tag: 'organizations' }),
      })
      router.push(`/app/${data.orgId}/${data.teamId}/dashboard`)
    },
  })

  function onSubmit(values: FormValues) {
    mutation.mutate(values)
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
        <Button type='submit' className='w-full' disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create Organization and Team'}
        </Button>
      </form>
    </Form>
  )
}
