import { NextResponse } from "next/server"
import { z } from "zod"

import { getURL } from "@/lib/utils"
import { createClient } from "@/lib/supabase/server"

import nodemailer from "nodemailer"
import aws from "@aws-sdk/client-ses"
// let { defaultProvider } = require("@aws-sdk/credential-provider-node")

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

  const ses = new aws.SES({
    apiVersion: "2010-12-01",
    region: process.env.AWS_REGION || "",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  })

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: { ses, aws },
    sendingRate: 1,
  })

  const filteredProjectRoles = team_roles.filter(
    (team) => team.role !== "no_access"
  )

  const { data: token, error: memberError } = await supabase.rpc(
    "create_org_invite",
    {
      input_org_id: org_id,
      invitee_email: email,
      org_member_role: org_member_role,
      invitation_type: invitation_type,
      team_roles: filteredProjectRoles,
    }
  )

  if (memberError) {
    return new Response(JSON.stringify(memberError), { status: 500 })
  }

  try {
    await transporter.sendMail({
      from: "noreply@mail.alwaysauto.com",
      to: email,
      subject: "Always Auto Invitation",
      html: `<a href="${url}/invitation?token=${token}">Click here to accept the invitation</a>`,
    })
    return NextResponse.json(
      { message: "Invitation sent successfully." },
      { status: 200 }
    )
  } catch (error) {
    return new Response(JSON.stringify(error), { status: 500 })
  }
}