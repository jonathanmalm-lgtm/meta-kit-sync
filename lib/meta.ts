import crypto from 'crypto'

export function verifyMetaSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false
  const expected =
    'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

export interface LeadData {
  firstName: string
  lastName: string
  email: string
}

export async function fetchLeadData(
  leadgenId: string,
  pageAccessToken: string
): Promise<LeadData> {
  const url = `https://graph.facebook.com/v18.0/${leadgenId}?fields=field_data&access_token=${pageAccessToken}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Meta Graph API error: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  const fields = data.field_data as Array<{ name: string; values: string[] }>
  const get = (name: string) => fields.find((f) => f.name === name)?.values[0] ?? ''
  return {
    firstName: get('first_name'),
    lastName: get('last_name'),
    email: get('email'),
  }
}
