import { NextResponse } from "next/server"
import { z } from "zod"

import { getURL } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"

import { sendEmail } from "@/lib/email/service"

const inviteSchema = z.object({
  email: z.string().email(),
  org_member_role: z.enum(["admin", "member"]),
  org_id: z.string(),
  invitation_type: z.enum(["one-time", "24-hour"]),
  team_roles: z.array(
    z.object({
      team_id: z.string(),
      team_name: z.string(),
      role: z.enum(["no_access", "admin", "member"]),
    })
  ),
})

type InviteProps = z.infer<typeof inviteSchema>

export async function POST(req: Request): Promise<Response> {
  const json = await req.json()
  const parsedInviteRequest: InviteProps = inviteSchema.parse(json)
  const { email, org_member_role, org_id, invitation_type, team_roles } =
    parsedInviteRequest

  const url = getURL()

  const supabase = await createClient()


  const filteredTeamRoles = team_roles.filter(
    (team) => team.role !== "no_access"
  )

  const { data: token, error: memberError } = await supabase.rpc(
    "create_org_invite",
    {
      input_org_id: org_id,
      invitee_email: email,
      org_member_role_id: org_member_role,
      invitation_type: invitation_type,
      team_member_roles: filteredTeamRoles,
    }
  )

  if (memberError) {
    return new Response(JSON.stringify(memberError), { status: 500 })
  }

  const emailResult = await sendEmail({
    from: "noreply@mail.alwaysauto.com",
    to: email,
    subject: "Always Auto Invitation",
    html: `<a href="${url}/invitation?token=${token}">Click here to accept the invitation</a>`,
  })

  if (emailResult.error) {
    return new Response(JSON.stringify(emailResult.error), { status: 500 })
  }

  return NextResponse.json(
    { message: "Invitation sent successfully." },
    { status: 200 }
  )
}