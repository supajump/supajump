'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  CreateRoleForm
} from '@features/roles/create-role-form'
import { PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreateRoleModalProps {
  orgId: string
  teams: { id: string; name: string }[]
}

export function CreateRoleModal({ orgId, teams }: CreateRoleModalProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className='mr-2 h-4 w-4' />
          Create Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
      <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Create a new role for your organization. You can edit it later.
          </DialogDescription>
        </DialogHeader>
        <CreateRoleForm orgId={orgId} teams={teams} />
      </DialogContent>
    </Dialog>
  )
}
