'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Permission {
  resource: string
  action: string
}

interface FormValues {
  scope: 'organization' | 'team'
  name: string
  displayName: string
  description: string
  teamId?: string
  permissions: Permission[]
}

interface CreateRoleFormProps {
  orgId: string
  teams: { id: string; name: string }[]
}

export function CreateRoleForm({ orgId, teams }: CreateRoleFormProps) {
  const supabase = createClient()
  const form = useForm<FormValues>({
    defaultValues: {
      scope: 'organization',
      name: '',
      displayName: '',
      description: '',
      permissions: [{ resource: '', action: '' }],
    },
  })
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'permissions',
  })
  const scope = form.watch('scope')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    const { data, error } = await supabase
      .from('roles')
      .insert({
        scope: values.scope,
        name: values.name,
        display_name: values.displayName,
        description: values.description,
        org_id: orgId,
        team_id: values.scope === 'team' ? values.teamId : null,
      })
      .select()
      .single()

    if (error || !data) {
      setError(error?.message || 'Failed to create role')
      setIsLoading(false)
      return
    }

    for (const perm of values.permissions) {
      const { error: permError } = await supabase.from('role_permissions').insert({
        role_id: data.id,
        org_id: orgId,
        team_id: values.scope === 'team' ? values.teamId : null,
        resource: perm.resource,
        action: perm.action,
      })
      if (permError) {
        setError(permError.message)
        setIsLoading(false)
        return
      }
    }

    setSuccess('Role created successfully')
    form.reset()
    setIsLoading(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="scope"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scope</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {scope === 'team' && (
          <FormField
            control={form.control}
            name="teamId"
            rules={{ required: 'Team is required' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="name"
          rules={{ required: 'Role name is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="role_name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Display Name" {...field} />
              </FormControl>
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
                <Textarea rows={3} {...field} />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="space-y-4">
          <Label>Permissions</Label>
          {fields.map((fieldItem, index) => (
            <div key={fieldItem.id} className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Resource"
                {...form.register(`permissions.${index}.resource` as const, {
                  required: 'Required',
                })}
              />
              <Input
                placeholder="Action"
                {...form.register(`permissions.${index}.action` as const, {
                  required: 'Required',
                })}
              />
              <div className="col-span-2 text-right">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            onClick={() => append({ resource: '', action: '' })}
          >
            Add Permission
          </Button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Role'}
        </Button>
      </form>
    </Form>
  )
}
