import { POST } from '@/app/api/meta/webhook/retry/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/qstash', () => ({
  verifyQStashSignature: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/config', () => ({
  getFormMapping: jest.fn().mockReturnValue({
    pageMapping: { kitApiKey: 'kit-key' },
    formMapping: { kitFormId: 'kf-1', kitTagId: 'kt-1' },
  }),
}))

jest.mock('@/lib/kit', () => ({
  subscribeToKit: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/notify', () => ({
  notifyFailure: jest.fn().mockResolvedValue(undefined),
}))

const validBody = JSON.stringify({
  pageId: 'page-123',
  formId: 'form-456',
  lead: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
})

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/meta/webhook/retry', {
    method: 'POST',
    body,
    headers: { 'upstash-signature': 'valid-sig', ...headers },
  })
}

beforeEach(() => jest.clearAllMocks())

describe('POST /api/meta/webhook/retry', () => {
  it('returns 401 when QStash signature is invalid', async () => {
    const { verifyQStashSignature } = require('@/lib/qstash')
    verifyQStashSignature.mockResolvedValueOnce(false)
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('returns 200 when Kit subscribe succeeds', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(200)
  })

  it('returns 500 to trigger QStash retry when Kit fails (not last retry)', async () => {
    const { subscribeToKit } = require('@/lib/kit')
    subscribeToKit.mockRejectedValueOnce(new Error('Kit down'))
    const res = await POST(
      makeRequest(validBody, { 'upstash-retried': '2', 'upstash-retries': '5' })
    )
    expect(res.status).toBe(500)
  })

  it('sends notification email and returns 200 on final retry failure', async () => {
    const { subscribeToKit } = require('@/lib/kit')
    const { notifyFailure } = require('@/lib/notify')
    subscribeToKit.mockRejectedValueOnce(new Error('Kit down'))
    const res = await POST(
      makeRequest(validBody, { 'upstash-retried': '5', 'upstash-retries': '5' })
    )
    expect(notifyFailure).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com' })
    )
    expect(res.status).toBe(200) // don't re-retry after notification
  })
})
