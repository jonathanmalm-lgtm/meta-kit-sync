export interface SubscribeParams {
  apiKey: string
  kitFormId: string
  kitTagId: string
  firstName: string
  lastName: string
  email: string
}

export async function subscribeToKit(params: SubscribeParams): Promise<void> {
  const { apiKey, kitFormId, kitTagId, firstName, lastName, email } = params

  // Step 1: Create or upsert subscriber with name and last_name field
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

  // Step 2: Add subscriber to form
  const formRes = await fetch(`https://api.kit.com/v4/forms/${kitFormId}/subscribers`, {
    method: 'POST',
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: email,
    }),
  })

  if (!formRes.ok) {
    const body = await formRes.text()
    throw new Error(`Kit API error: ${formRes.status} - ${body}`)
  }

  // Step 3: Tag the subscriber
  const tagRes = await fetch(`https://api.kit.com/v4/subscribers/${subscriberId}/tags/${kitTagId}`, {
    method: 'POST',
    headers: {
      'X-Kit-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  if (!tagRes.ok) {
    const body = await tagRes.text()
    throw new Error(`Kit API error: ${tagRes.status} - ${body}`)
  }
}
