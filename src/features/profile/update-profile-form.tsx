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

interface UpdateProfileFormProps {
  profile: Database['public']['Tables']['profiles']['Row']
}

interface FormValues {
  user_name: string
  first_name: string
  last_name: string
}

export function UpdateProfileForm({ profile }: UpdateProfileFormProps) {
  const form = useForm<FormValues>({
    defaultValues: {
      user_name: profile.user_name ?? '',
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
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
      .from('profiles')
      .update({
        user_name: values.user_name,
        first_name: values.first_name,
        last_name: values.last_name,
      })
      .eq('id', profile.id)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Profile updated')
    }
    setIsLoading(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="user_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
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
