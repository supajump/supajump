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

interface FormValues {
  password: string
  confirm: string
}

export function ChangePasswordForm() {
  const form = useForm<FormValues>({ defaultValues: { password: '', confirm: '' } })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    if (values.password !== values.confirm) {
      setError('Passwords do not match')
      return
    }
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password updated')
      form.reset()
    }
    setIsLoading(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="password"
          rules={{ required: 'Password is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm"
          rules={{ required: 'Please confirm password' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Change Password'}
        </Button>
      </form>
    </Form>
  )
}
