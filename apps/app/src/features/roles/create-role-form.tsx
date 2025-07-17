"use client"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,

  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"


interface FormValues {
  scope: "organization" | "team"
  name: string
  displayName: string
  description: string
  teamId?: string
}

interface CreateRoleFormProps {
  orgId: string
  teams: { id: string; name: string }[]
}

export function CreateRoleForm({ orgId, teams }: CreateRoleFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const form = useForm<FormValues>({
    defaultValues: {
      scope: "organization",
      name: "",
      displayName: "",
      description: "",

    },
  })
  const scope = form.watch("scope")

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from("roles")
      .insert({
        scope: values.scope,
        name: values.name,
        display_name: values.displayName,
        description: values.description,
        org_id: orgId,
        team_id: values.scope === "team" ? values.teamId : null,
      })
      .select()
      .single()

    if (error || !data) {
      setError(error?.message || "Failed to create role")
      setIsLoading(false)
      return
    }

    // Redirect to role edit page to manage permissions
    router.push(`/app/${orgId}/roles/${data.id}/edit`)

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
        {scope === "team" && (
          <FormField
            control={form.control}
            name="teamId"
            rules={{ required: "Team is required" }}
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
          rules={{ required: "Role name is required" }}
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

        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating..." : "Create Role"}
        </Button>
      </form>
    </Form>
  )
}
