export interface SubscribeParams {
  apiKey: string
  kitTagId: string
  firstName: string
  lastName: string
  email: string
}

export async function subscribeToKit(params: SubscribeParams): Promise<void> {
  const { apiKey, kitTagId, firstName, lastName, email } = params

  // Step 1: Create or upsert subscriber
  const createRes = await fetch('https://api.kit.com/v4/subscribers', {
    method: 'POST',
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: email,
      first_name: firstName,
      fields: { last_name: lastName },
    }),
  })

  if (!createRes.ok) {
    const body = await createRes.text()
    throw new Error(`Kit API error: ${createRes.status} - ${body}`)
  }

  const createData = await createRes.json()
  const subscriberId = createData.subscriber?.id

  if (!subscriberId) {
    throw new Error('Kit API error: No subscriber ID returned')
  }

  // Step 2: Tag the subscriber
  const tagRes = await fetch(`https://api.kit.com/v4/tags/${kitTagId}/subscribers`, {
    method: 'POST',
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subscriber_id: subscriberId }),
  })

  if (!tagRes.ok) {
    const body = await tagRes.text()
    throw new Error(`Kit API error: ${tagRes.status} - ${body}`)
  }
}
