'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
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
import type { Database } from '@/lib/database.types'

interface UpdateTeamFormProps {
  team: Database['public']['Tables']['teams']['Row']
}

interface FormValues {
  name: string
}

export default function UpdateTeamForm({ team }: UpdateTeamFormProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      name: team.name ?? '',
    },
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('teams')
      .update({ name: values.name })
      .eq('id', team.id)

    if (error) {
      setError(error.message)
    } else {
      setSuccess('Team updated')
    }
    setIsLoading(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
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
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  )
}
