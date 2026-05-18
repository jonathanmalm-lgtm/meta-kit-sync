/**
 * One-off script to manually retry leads that failed to sync to Kit.
 * Fill in the LEADS array from your failure notification emails, then run:
 *
 *   MAPPINGS='...' npx tsx scripts/retry-failed-leads.ts
 */

import { readFileSync } from 'fs'

// Load .env.local — handles unescaped JSON values wrapped in outer quotes
try {
  const lines = readFileSync('.env.local', 'utf8').split('\n')
  for (const line of lines) {
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1)
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
    process.env[key] ??= val
  }
} catch {}

import { getFormMapping } from '../lib/config'
import { subscribeToKit } from '../lib/kit'

const LEADS = [
  { pageId: '733712583418674', formId: '9735688143162796', firstName: 'Mandy', email: 'amandarcrow77@gmail.com' },
  { pageId: '733712583418674', formId: '9735688143162796', firstName: 'Brennan', email: 'brennan@myjourneychurch.com' },
  { pageId: '733712583418674', formId: '9735688143162796', firstName: 'Raquel', email: 'Purpl3bxtch@aim.com' },
  { pageId: '733712583418674', formId: '9735688143162796', firstName: 'Rachel', email: 'rachel.jury2009@gmail.com' },
  { pageId: '733712583418674', formId: '9735688143162796', firstName: 'Catherine', email: 'Purucker51@aol.com' },
]

async function main() {
  if (LEADS.length === 0) {
    console.error('No leads to process. Add entries to the LEADS array.')
    process.exit(1)
  }

  let passed = 0
  let failed = 0

  for (const lead of LEADS) {
    const { pageId, formId, firstName, email } = lead as {
      pageId: string
      formId: string
      firstName: string
      email: string
    }
    try {
      const { pageMapping, formMapping } = getFormMapping(pageId, formId)
      await subscribeToKit({
        apiKey: pageMapping.kitApiKey,
        kitTagId: formMapping.kitTagId,
        firstName,
        email,
      })
      console.log(`✓ ${email}`)
      passed++
    } catch (err) {
      console.error(`✗ ${email}: ${err instanceof Error ? err.message : err}`)
      failed++
    }
  }

  console.log(`\nDone: ${passed} succeeded, ${failed} failed`)
}

main()
