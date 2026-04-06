import { Client, Receiver } from '@upstash/qstash'
import type { LeadData } from './meta'

export interface RetryPayload {
  pageId: string
  formId: string
  lead: LeadData
}

export async function enqueueRetry(baseUrl: string, payload: RetryPayload): Promise<void> {
  const client = new Client({ token: process.env.QSTASH_TOKEN! })
  await client.publishJSON({
    url: `${baseUrl}/api/meta/webhook/retry`,
    body: payload,
    retries: 5,
  })
}

export async function verifyQStashSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  })
  try {
    await receiver.verify({ signature, body })
    return true
  } catch {
    return false
  }
}
