export interface FormMapping {
  kitTagId: string
}

export interface PageMapping {
  metaPageAccessToken: string
  kitApiKey: string
  forms: Record<string, FormMapping>
}

export interface Config {
  pages: Record<string, PageMapping>
}

export function getConfig(): Config {
  const raw = process.env.MAPPINGS
  if (!raw) throw new Error('MAPPINGS environment variable is not set')
  try {
    return JSON.parse(raw) as Config
  } catch {
    throw new Error('MAPPINGS environment variable is not valid JSON')
  }
}

export function getFormMapping(
  pageId: string,
  formId: string
): { pageMapping: PageMapping; formMapping: FormMapping } {
  const config = getConfig()
  const pageMapping = config.pages[pageId]
  if (!pageMapping) throw new Error(`No mapping found for page ID: ${pageId}`)
  const formMapping = pageMapping.forms[formId]
  if (!formMapping)
    throw new Error(`No mapping found for form ID: ${formId} on page: ${pageId}`)
  return { pageMapping, formMapping }
}
