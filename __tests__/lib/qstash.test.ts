import { enqueueRetry, verifyQStashSignature } from '@/lib/qstash'

const mockPublishJSON = jest.fn().mockResolvedValue({ messageId: 'msg-1' })
const mockVerify = jest.fn().mockResolvedValue(true)

jest.mock('@upstash/qstash', () => ({
  Client: jest.fn().mockImplementation(() => ({
    publishJSON: mockPublishJSON,
  })),
  Receiver: jest.fn().mockImplementation(() => ({
    verify: mockVerify,
  })),
}))

const payload = {
  pageId: 'page-123',
  formId: 'form-456',
  lead: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
}

describe('enqueueRetry', () => {
  beforeEach(() => {
    process.env.QSTASH_TOKEN = 'qstash-token'
    mockPublishJSON.mockClear()
  })

  it('publishes a retry job to QStash', async () => {
    await enqueueRetry('https://example.vercel.app', payload)
    expect(mockPublishJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.vercel.app/api/meta/webhook/retry',
        body: payload,
        retries: 5,
      })
    )
  })
})

describe('verifyQStashSignature', () => {
  beforeEach(() => {
    process.env.QSTASH_CURRENT_SIGNING_KEY = 'current-key'
    process.env.QSTASH_NEXT_SIGNING_KEY = 'next-key'
    mockVerify.mockClear()
    mockVerify.mockResolvedValue(true)
  })

  it('returns true when signature is valid', async () => {
    const result = await verifyQStashSignature('body', 'valid-sig')
    expect(result).toBe(true)
  })

  it('returns false when Receiver throws', async () => {
    mockVerify.mockRejectedValueOnce(new Error('invalid'))
    const result = await verifyQStashSignature('body', 'bad-sig')
    expect(result).toBe(false)
  })
})
