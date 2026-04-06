import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaSignature, fetchLeadData, type LeadData } from '@/lib/meta'
import { getFormMapping } from '@/lib/config'
import { subscribeToKit } from '@/lib/kit'
import { enqueueRetry } from '@/lib/qstash'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifyMetaSignature(rawBody, signature, process.env.META_APP_SECRET!)) {
    return new NextResponse('Unauthorized', { status: 403 })
  }

  const body = JSON.parse(rawBody)

  for (const entry of body.entry ?? []) {
    const pageId: string = entry.id
    for (const change of entry.changes ?? []) {
      if (change.field !== 'leadgen') continue
      const leadgenId: string = change.value.leadgen_id
      const formId: string = change.value.form_id
      await processLead({ pageId, formId, leadgenId })
    }
  }

  return new NextResponse('OK', { status: 200 })
}

async function processLead({
  pageId,
  formId,
  leadgenId,
}: {
  pageId: string
  formId: string
  leadgenId: string
}): Promise<void> {
  let lead: LeadData | null = null
  try {
    const { pageMapping, formMapping } = getFormMapping(pageId, formId)
    lead = await fetchLeadData(leadgenId, pageMapping.metaPageAccessToken)
    await subscribeToKit({
      apiKey: pageMapping.kitApiKey,
      kitFormId: formMapping.kitFormId,
      kitTagId: formMapping.kitTagId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
    })
  } catch (error) {
    console.error(`Failed to process lead ${leadgenId}:`, error)
    if (lead) {
      await enqueueRetry(process.env.BASE_URL!, { pageId, formId, lead })
    } else {
      console.error(`Could not fetch lead data for ${leadgenId} — cannot enqueue retry`)
    }
  }
}
