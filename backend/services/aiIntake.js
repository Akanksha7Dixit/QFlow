const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 15000)

const extractionValues = {
  severity: ['low', 'moderate', 'high'],
  urgency: ['routine', 'soon', 'urgent', 'emergency'],
}

const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string')

const validateExtraction = (value) => {
  if (!value || typeof value !== 'object') throw new Error('AI extraction must be an object')
  for (const field of ['symptoms', 'severity_indicators', 'relevant_history', 'missing_information', 'red_flags']) {
    if (!isStringArray(value[field])) throw new Error(`AI extraction field ${field} must be a string array`)
  }
  if (!extractionValues.severity.includes(value.severity)) throw new Error('AI extraction severity is invalid')
  if (!extractionValues.urgency.includes(value.urgency)) throw new Error('AI extraction urgency is invalid')
  if (value.duration !== null && typeof value.duration !== 'string') throw new Error('AI extraction duration is invalid')
  if (value.possible_department !== null && typeof value.possible_department !== 'string') throw new Error('AI extraction department is invalid')
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) throw new Error('AI extraction confidence is invalid')
  return value
}

async function extractIntake(input) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/intake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`AI service returned ${response.status}`)
    return { ok: true, data: validateExtraction(await response.json()) }
  } catch (error) {
    return { ok: false, error: error.message || 'AI service unavailable' }
  } finally {
    clearTimeout(timeout)
  }
}

module.exports = { extractIntake, validateExtraction }
