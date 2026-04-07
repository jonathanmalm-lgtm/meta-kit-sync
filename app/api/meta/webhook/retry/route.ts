import { NextRequest, NextResponse } from 'next/server'
import { verifyQStashSignature } from '@/lib/qstash'
import { getFormMapping } from '@/lib/config'
import { subscribeToKit } from '@/lib/kit'
import { notifyFailure } from '@/lib/notify'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get('upstash-signature') ?? ''

  const isValid = await verifyQStashSignature(rawBody, signature)
  if (!isValid) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { pageId, formId, lead } = JSON.parse(rawBody)
  const retriedCount = parseInt(request.headers.get('upstash-retried') ?? '0')
  const maxRetries = parseInt(request.headers.get('upstash-retries') ?? '5')
  const isLastRetry = retriedCount >= maxRetries

  try {
    const { pageMapping, formMapping } = getFormMapping(pageId, formId)
    await subscribeToKit({
      apiKey: pageMapping.kitApiKey,
      kitTagId: formMapping.kitTagId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
    })
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`Retry failed for lead ${lead.email}:`, errorMessage)

    if (isLastRetry) {
      await notifyFailure({
        pageId,
        formId,
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        error: errorMessage,
      })
      // Return 200 — notified user, no more retries needed
      return new NextResponse('Exhausted', { status: 200 })
    }

    // Return 500 — signals QStash to retry
    return new NextResponse('Error', { status: 500 })
  }
}
