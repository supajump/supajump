'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/queries'
import { rolesKeys } from '@/queries/keys'
import { toast } from 'sonner'

export function useRolePermissions(roleId: string) {
  const supabase = createClient()
  
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: rolesKeys.permissions(roleId),
    queryFn: () => api.roles.getPermissions(supabase, roleId),
  })
}

export function useUpdateRolePermissions(roleId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()
  
  return useMutation({
    mutationFn: (permissions: Parameters<typeof api.roles.updatePermissions>[2]) => 
      api.roles.updatePermissions(supabase, roleId, permissions),
    onSuccess: () => {
      // Invalidate the permissions query to refetch the latest data
      queryClient.invalidateQueries({ queryKey: rolesKeys.permissions(roleId) })
      toast.success('Permissions updated successfully')
    },
    onError: (error) => {
      toast.error('Failed to update permissions: ' + error.message)
    },
  })
}