import { subscribeToKit } from '@/lib/kit'

const params = {
  apiKey: 'kit-api-key',
  kitFormId: 'form-123',
  kitTagId: 'tag-456',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
}

describe('subscribeToKit', () => {
  it('creates/updates subscriber with name and last_name field', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscriber: { id: 1 } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as unknown as Response)

    await subscribeToKit(params)

    // First call: create/upsert subscriber
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.kit.com/v4/subscribers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Kit-Api-Key': 'kit-api-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          email_address: 'jane@example.com',
          first_name: 'Jane',
          fields: { last_name: 'Smith' },
        }),
      })
    )
  })

  it('throws when Kit API returns an error during subscriber creation', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      text: async () => 'Unprocessable Entity',
    } as unknown as Response)

    await expect(subscribeToKit(params)).rejects.toThrow('Kit API error: 422')
  })

  it('adds subscriber to form', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscriber: { id: 1 } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as unknown as Response)

    await subscribeToKit(params)

    // Second call: add subscriber to form
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.kit.com/v4/forms/form-123/subscribers',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Kit-Api-Key': 'kit-api-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          email_address: 'jane@example.com',
        }),
      })
    )
  })

  it('throws when Kit API returns an error during form subscription', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscriber: { id: 1 } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as unknown as Response)

    await expect(subscribeToKit(params)).rejects.toThrow('Kit API error: 400')
  })

  it('tags subscriber with provided tag', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscriber: { id: 1 } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as unknown as Response)

    await subscribeToKit(params)

    // Third call: tag subscriber
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'https://api.kit.com/v4/subscribers/1/tags/tag-456',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Kit-Api-Key': 'kit-api-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({}),
      })
    )
  })

  it('throws when Kit API returns an error during tagging', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ subscriber: { id: 1 } }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Not Found',
      } as unknown as Response)

    await expect(subscribeToKit(params)).rejects.toThrow('Kit API error: 404')
  })
})
