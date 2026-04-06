import { notifyFailure } from '@/lib/notify'

const mockSend = jest.fn().mockResolvedValue({ id: 'email-1' })

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}))

describe('notifyFailure', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'resend-key'
    process.env.NOTIFY_EMAIL = 'admin@example.com'
    process.env.NOTIFY_SENDER_EMAIL = 'noreply@example.com'
    jest.clearAllMocks()
  })

  it('sends a failure email with lead details', async () => {
    await notifyFailure({
      pageId: 'page-123',
      formId: 'form-456',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      error: 'Kit API error: 500',
    })

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'noreply@example.com',
        to: 'admin@example.com',
        subject: expect.stringContaining('Lead sync failed'),
      })
    )
  })
})
