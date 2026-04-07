import { GET, POST } from '@/app/api/meta/webhook/route'
import { NextRequest } from 'next/server'

// Mock all lib modules
jest.mock('@/lib/config', () => ({
  getFormMapping: jest.fn().mockReturnValue({
    pageMapping: {
      metaPageAccessToken: 'page-token',
      kitApiKey: 'kit-key',
    },
    formMapping: { kitTagId: 'kt-1' },
  }),
}))

jest.mock('@/lib/meta', () => ({
  verifyMetaSignature: jest.fn().mockReturnValue(true),
  fetchLeadData: jest.fn().mockResolvedValue({
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
  }),
}))

jest.mock('@/lib/kit', () => ({
  subscribeToKit: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/qstash', () => ({
  enqueueRetry: jest.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  process.env.META_VERIFY_TOKEN = 'my-verify-token'
  process.env.META_APP_SECRET = 'my-app-secret'
  process.env.BASE_URL = 'https://example.vercel.app'
  jest.clearAllMocks()
})

describe('GET /api/meta/webhook', () => {
  it('returns challenge when verify token matches', async () => {
    const req = new NextRequest(
      'http://localhost/api/meta/webhook?hub.mode=subscribe&hub.verify_token=my-verify-token&hub.challenge=abc123'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('abc123')
  })

  it('returns 403 when verify token does not match', async () => {
    const req = new NextRequest(
      'http://localhost/api/meta/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123'
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/meta/webhook', () => {
  const validBody = JSON.stringify({
    object: 'page',
    entry: [
      {
        id: 'page-123',
        changes: [
          {
            field: 'leadgen',
            value: { leadgen_id: 'lg-1', form_id: 'form-456' },
          },
        ],
      },
    ],
  })

  it('returns 403 when signature is invalid', async () => {
    const { verifyMetaSignature } = require('@/lib/meta')
    verifyMetaSignature.mockReturnValueOnce(false)
    const req = new NextRequest('http://localhost/api/meta/webhook', {
      method: 'POST',
      body: validBody,
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('subscribes lead to Kit on valid event', async () => {
    const { subscribeToKit } = require('@/lib/kit')
    const req = new NextRequest('http://localhost/api/meta/webhook', {
      method: 'POST',
      body: validBody,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(subscribeToKit).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com' })
    )
  })

  it('enqueues retry if Kit call fails', async () => {
    const { subscribeToKit } = require('@/lib/kit')
    const { enqueueRetry } = require('@/lib/qstash')
    subscribeToKit.mockRejectedValueOnce(new Error('Kit down'))
    const req = new NextRequest('http://localhost/api/meta/webhook', {
      method: 'POST',
      body: validBody,
    })
    const res = await POST(req)
    expect(res.status).toBe(200) // always 200 to Meta
    expect(enqueueRetry).toHaveBeenCalled()
  })

  it('ignores non-leadgen changes', async () => {
    const { subscribeToKit } = require('@/lib/kit')
    const otherBody = JSON.stringify({
      object: 'page',
      entry: [{ id: 'page-123', changes: [{ field: 'feed', value: {} }] }],
    })
    const req = new NextRequest('http://localhost/api/meta/webhook', {
      method: 'POST',
      body: otherBody,
    })
    await POST(req)
    expect(subscribeToKit).not.toHaveBeenCalled()
  })
})
