'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { createClient } from '@/lib/supabase/client'

export function DeleteTeamButton({ orgId, teamId }: { orgId: string; teamId: string }) {
  const [value, setValue] = useState('')
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsLoading(true)
    const supabase = createClient()
    await supabase.from('teams').delete().eq('id', teamId)
    router.push(`/app/${orgId}`)
  }

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) {
          setStep(1)
          setValue('')
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Team</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team</AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible. Type DELETE to continue.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  disabled={value !== 'DELETE'}
                  onClick={() => setStep(2)}
                >
                  Continue
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the team and all related data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <Button
                  variant="destructive"
                  disabled={isLoading}
                  onClick={handleDelete}
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
