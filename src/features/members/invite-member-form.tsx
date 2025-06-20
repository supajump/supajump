'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'

interface TeamRole {
  teamId: string
  roleIds: string[]
}

interface FormValues {
  email: string
  orgRoleIds: string[]
  teamRoles: TeamRole[]
}

interface InviteMemberFormProps {
  orgId: string
  orgRoles: { id: string; name: string }[]
  teams: { id: string; name: string }[]
  teamRolesMap: Record<string, { id: string; name: string }[]>
}

export default function InviteMemberForm({
  orgId,
  orgRoles,
  teams,
  teamRolesMap,
}: InviteMemberFormProps) {
  const supabase = createClient()
  const form = useForm<FormValues>({
    defaultValues: { email: '', orgRoleIds: [], teamRoles: [] },
  })
  const { fields: teamRoleFields, append, remove } = useFieldArray({
    control: form.control,
    name: 'teamRoles',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const addTeamRole = () => append({ teamId: '', roleIds: [] })

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const teamAssignments = values.teamRoles
      .filter((tr) => tr.teamId && tr.roleIds.length > 0)
      .flatMap((tr) => tr.roleIds.map((r) => ({ project_id: tr.teamId, role: r })))

    const { error } = await supabase.rpc('create_org_invite', {
      input_org_id: orgId,
      org_member_role_id: values.orgRoleIds[0],
      invitee_email: values.email,
      invitation_type: 'one-time',
      project_member_roles: teamAssignments.length > 0 ? teamAssignments : null,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    setSuccess('Invitation sent')
    form.reset()
    setIsLoading(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          rules={{ required: 'Email is required' }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <Label>Organization Roles</Label>
          {orgRoles.map((role) => (
            <div key={role.id} className="flex items-center gap-2">
              <Checkbox
                id={`org-role-${role.id}`}
                {...form.register('orgRoleIds')}
                value={role.id}
              />
              <label htmlFor={`org-role-${role.id}`}>{role.name}</label>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Team Memberships</Label>
            <Button type="button" size="sm" variant="secondary" onClick={addTeamRole}>
              Add Team
            </Button>
          </div>
          {teamRoleFields.map((fieldItem, index) => (
            <div key={fieldItem.id} className="border p-4 rounded-md space-y-4">
              <FormField
                control={form.control}
                name={`teamRoles.${index}.teamId` as const}
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
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <Label>Roles</Label>
                {teamRolesMap[form.watch(`teamRoles.${index}.teamId`) ?? '']?.map((r) => (
                  <div key={r.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`team-${index}-role-${r.id}`}
                      {...form.register(`teamRoles.${index}.roleIds` as const)}
                      value={r.id}
                    />
                    <label htmlFor={`team-${index}-role-${r.id}`}>{r.name}</label>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => remove(index)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Invite'}
        </Button>
      </form>
    </Form>
  )
}
