import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { organizationsKeys, teamsKeys } from '@/queries/keys'

interface CreateTeamDialogProps {
  orgId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormValues {
  name: string
}

export default function CreateTeamDialog({ orgId, open, onOpenChange }: CreateTeamDialogProps) {
  const form = useForm<FormValues>({ defaultValues: { name: '' } })
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api.teams.create(orgId, values.name),
    onSuccess: async (teamId: string) => {
      await queryClient.invalidateQueries({ queryKey: organizationsKeys.allWithTeams() })
      await queryClient.invalidateQueries({ queryKey: teamsKeys.list(orgId) })
      await fetch('/api/revalidate-tag', {
        method: 'POST',
        body: JSON.stringify({ tag: 'teams' }),
      })
      form.reset()
      onOpenChange(false)
      router.push(`/app/${orgId}/${teamId}/dashboard`)
    },
    onError: (err: Error) => setError(err.message),
  })

  function onSubmit(values: FormValues) {
    setError(null)
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Team</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: 'Team name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Team" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Team'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
