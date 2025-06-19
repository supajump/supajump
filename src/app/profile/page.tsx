import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UpdateProfileForm } from '@/components/update-profile-form'
import { ChangePasswordForm } from '@/components/change-password-form'
import { DeleteAccountButton } from '@/components/delete-account-button'
import { api } from '@/queries'

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const profile = await api.profiles.getById(supabase, user.id)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-xl space-y-10">
        <h1 className="text-3xl font-bold">Profile</h1>
        {profile && <UpdateProfileForm profile={profile} />}
        <ChangePasswordForm />
        <div className="pt-6 border-t">
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  )
}
