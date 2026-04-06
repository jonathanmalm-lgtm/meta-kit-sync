import crypto from 'crypto'
import { verifyMetaSignature, fetchLeadData } from '@/lib/meta'

const APP_SECRET = 'test-secret'

function makeSignature(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

describe('verifyMetaSignature', () => {
  it('returns true for a valid signature', () => {
    const body = JSON.stringify({ test: true })
    const sig = makeSignature(body, APP_SECRET)
    expect(verifyMetaSignature(body, sig, APP_SECRET)).toBe(true)
  })

  it('returns false for an invalid signature', () => {
    const body = JSON.stringify({ test: true })
    expect(verifyMetaSignature(body, 'sha256=bad', APP_SECRET)).toBe(false)
  })

  it('returns false when signature is null', () => {
    expect(verifyMetaSignature('body', null, APP_SECRET)).toBe(false)
  })
})

describe('fetchLeadData', () => {
  it('parses field_data into lead fields', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'lead-1',
        field_data: [
          { name: 'first_name', values: ['Jane'] },
          { name: 'last_name', values: ['Smith'] },
          { name: 'email', values: ['jane@example.com'] },
        ],
      }),
    } as unknown as Response)

    const lead = await fetchLeadData('lead-1', 'page-token')
    expect(lead).toEqual({
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
    })
  })

  it('throws when Graph API returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
    } as Response)

    await expect(fetchLeadData('lead-1', 'bad-token')).rejects.toThrow(
      'Meta Graph API error: 400 Bad Request'
    )
  })
})
