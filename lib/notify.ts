import { Resend } from 'resend'

export interface FailedLeadNotification {
  pageId: string
  formId: string
  firstName: string
  lastName: string
  email: string
  error: string
}

export async function notifyFailure(data: FailedLeadNotification): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY!)
  const { pageId, formId, firstName, lastName, email, error } = data
  await resend.emails.send({
    from: process.env.NOTIFY_SENDER_EMAIL!,
    to: process.env.NOTIFY_EMAIL!,
    subject: 'Lead sync failed after all retries',
    text: [
      'A lead failed to sync to Kit after all retry attempts.',
      '',
      `Page ID:  ${pageId}`,
      `Form ID:  ${formId}`,
      `Name:     ${firstName} ${lastName}`,
      `Email:    ${email}`,
      `Error:    ${error}`,
      '',
      'Please add this subscriber to Kit manually.',
    ].join('\n'),
  })
}
