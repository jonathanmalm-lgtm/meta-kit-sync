import { getConfig, getFormMapping } from '@/lib/config'

const validMappings = JSON.stringify({
  pages: {
    'page-123': {
      metaPageAccessToken: 'token-abc',
      kitApiKey: 'kit-key-abc',
      forms: {
        'form-456': {
          kitFormId: 'kf-789',
          kitTagId: 'kt-111',
        },
      },
    },
  },
})

describe('getConfig', () => {
  it('parses valid MAPPINGS env var', () => {
    process.env.MAPPINGS = validMappings
    const config = getConfig()
    expect(config.pages['page-123'].kitApiKey).toBe('kit-key-abc')
  })

  it('throws if MAPPINGS is not set', () => {
    delete process.env.MAPPINGS
    expect(() => getConfig()).toThrow('MAPPINGS environment variable is not set')
  })

  it('throws if MAPPINGS is invalid JSON', () => {
    process.env.MAPPINGS = 'not-json'
    expect(() => getConfig()).toThrow('MAPPINGS environment variable is not valid JSON')
  })
})

describe('getFormMapping', () => {
  beforeEach(() => {
    process.env.MAPPINGS = validMappings
  })

  it('returns page and form mappings for valid IDs', () => {
    const { pageMapping, formMapping } = getFormMapping('page-123', 'form-456')
    expect(pageMapping.kitApiKey).toBe('kit-key-abc')
    expect(formMapping.kitFormId).toBe('kf-789')
    expect(formMapping.kitTagId).toBe('kt-111')
  })

  it('throws for unknown page ID', () => {
    expect(() => getFormMapping('unknown-page', 'form-456')).toThrow(
      'No mapping found for page ID: unknown-page'
    )
  })

  it('throws for unknown form ID', () => {
    expect(() => getFormMapping('page-123', 'unknown-form')).toThrow(
      'No mapping found for form ID: unknown-form on page: page-123'
    )
  })
})
