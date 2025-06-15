import nodemailer from 'nodemailer'
import aws from '@aws-sdk/client-ses'
import { Resend } from 'resend'

import { Result, ok, err } from '../result'

export interface EmailOptions {
  from: string
  to: string | string[]
  subject: string
  html: string
}

async function sendWithSes(
  options: EmailOptions
): Promise<Result<unknown, Error>> {
  try {
    const ses = new aws.SES({
      apiVersion: '2010-12-01',
      region: process.env.AWS_REGION || '',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    })

    const transporter = nodemailer.createTransport({
      SES: { ses, aws },
      sendingRate: 1
    })

    const result = await transporter.sendMail(options)
    return ok(result)
  } catch (error) {
    return err(error as Error)
  }
}

async function sendWithResend(
  options: EmailOptions
): Promise<Result<unknown, Error>> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || '')
    const result = await resend.emails.send(options)
    return ok(result)
  } catch (error) {
    return err(error as Error)
  }
}

export async function sendEmail(
  options: EmailOptions
): Promise<Result<unknown, Error>> {
  const provider = process.env.EMAIL_PROVIDER || 'ses'

  if (provider === 'resend') {
    return sendWithResend(options)
  }

  return sendWithSes(options)
}
