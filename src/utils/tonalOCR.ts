// Normalize common OCR character misreads (letter↔digit swaps)
export function ocrNormalize(text: string): string {
  return text
    .replace(/[|]/g, '/')       // pipe → slash (date separators)
    .replace(/l(?=\d)/g, '1')   // lowercase L before digit → 1
    .replace(/(?<=\d)l/g, '1')  // lowercase L after digit → 1
    .replace(/O(?=\d)/g, '0')   // capital O before digit → 0
    .replace(/(?<=\d)O/g, '0')  // capital O after digit → 0
    .replace(/(?<=\d)\s*[)\]]/g, '') // stray brackets after digits
    .replace(/(\d,)\s+(\d)/g, '$1$2') // collapse spaces in comma-formatted numbers (e.g. "12, 379" → "12,379")
}

export function parseTonalOCR(text: string) {
  // Work with both raw and OCR-normalized text
  const normalized = ocrNormalize(text)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // Volume: number followed by "lbs" — OCR may render comma as period, space, or drop it
  // OCR commonly misreads "lbs" as "1bs", "1s", "Ibs", "ls", etc.
  const volumeMatch = normalized.match(/(\d{1,3}[,.]\d{3,})\s*(?:lbs|1bs|1s|Ibs|ibs|ls)\b/i)
    || normalized.match(/(\d{4,})\s*(?:lbs|1bs|1s|Ibs|ibs|ls)\b/i)
  let weightLifted: number | null = null
  if (volumeMatch) {
    weightLifted = parseInt(volumeMatch[1].replace(/[^\d]/g, ''), 10)
    if (isNaN(weightLifted) || weightLifted === 0) weightLifted = null
  }
  // Fallback: look for a large number (4+ digits with comma) on the same line as a MM:SS pattern
  if (!weightLifted) {
    const fallbackMatch = normalized.match(/(\d{1,3},\d{3})\s*\S*\s*[-—]?\s*\d{1,3}:\d{2}/)
    if (fallbackMatch) {
      weightLifted = parseInt(fallbackMatch[1].replace(/[^\d]/g, ''), 10)
      if (isNaN(weightLifted) || weightLifted === 0) weightLifted = null
    }
  }

  // Duration: MM:SS pattern (strict)
  const durationMatch = normalized.match(/(\d{1,3}):(\d{2})/)
  let minutes: number | null = null
  if (durationMatch) {
    minutes = parseInt(durationMatch[1], 10) + (parseInt(durationMatch[2], 10) > 0 ? 1 : 0)
  }
  // Fallback: minutes-only pattern — digits followed by colon but garbled seconds
  if (!minutes) {
    const looseDuration = normalized.match(/(\d{1,3})\s*:\s*(?:\d{0,2}|\D)/)
    if (looseDuration) {
      minutes = parseInt(looseDuration[1], 10)
      if (isNaN(minutes) || minutes === 0) minutes = null
    }
  }
  // Fallback: 4-digit number near VOLUME/DURATION keywords where colon was dropped (e.g. "4205" = 42:05)
  if (!minutes) {
    const contextMatch = normalized.match(/\b(\d{3,4})\b(?=\s*(?:VOLUME|DURATION|WEIGHT|MIN))/i)
      || normalized.match(/(?:VOLUME|DURATION|WEIGHT|lbs)\s+\S*\s*(\d{3,4})\b/i)
    if (contextMatch) {
      const raw = contextMatch[1]
      if (raw.length === 4) {
        // MMSS: first 2 digits = minutes, last 2 = seconds
        minutes = parseInt(raw.substring(0, 2), 10) + (parseInt(raw.substring(2), 10) > 0 ? 1 : 0)
      } else if (raw.length === 3) {
        // MSS: first digit = minutes, last 2 = seconds
        minutes = parseInt(raw.substring(0, 1), 10) + (parseInt(raw.substring(1), 10) > 0 ? 1 : 0)
      }
      if (minutes !== null && (isNaN(minutes) || minutes === 0 || minutes > 300)) minutes = null
    }
  }

  // Date: M/D/YY pattern — try normalized text first (fixes pipe→slash, l→1, O→0)
  let date: Date | null = null
  const dateMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (dateMatch) {
    const month = parseInt(dateMatch[1], 10)
    const day = parseInt(dateMatch[2], 10)
    let year = parseInt(dateMatch[3], 10)
    if (year < 100) year += 2000
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      date = new Date(year, month - 1, day, 12, 0, 0)
    }
  }
  // Fallback: try matching date-like patterns with OCR artifacts (e.g. "5/4/ 26", "5 /4/26")
  if (!date) {
    const looseDateMatch = normalized.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)
    if (looseDateMatch) {
      const month = parseInt(looseDateMatch[1], 10)
      const day = parseInt(looseDateMatch[2], 10)
      let year = parseInt(looseDateMatch[3], 10)
      if (year < 100) year += 2000
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        date = new Date(year, month - 1, day, 12, 0, 0)
      }
    }
  }
  // Fallback: look for "Weeks" or week-related text with nearby numbers (e.g. "el Weeks to" → date context)
  // Try dot-separated dates (e.g. "5.4.26")
  if (!date) {
    const dotDateMatch = normalized.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/)
    if (dotDateMatch) {
      const month = parseInt(dotDateMatch[1], 10)
      const day = parseInt(dotDateMatch[2], 10)
      let year = parseInt(dotDateMatch[3], 10)
      if (year < 100) year += 2000
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        date = new Date(year, month - 1, day, 12, 0, 0)
      }
    }
  }
  // Fallback: dash-separated dates (e.g. "5-4-26")
  if (!date) {
    const dashDateMatch = normalized.match(/(\d{1,2})-(\d{1,2})-(\d{2,4})/)
    if (dashDateMatch) {
      const month = parseInt(dashDateMatch[1], 10)
      const day = parseInt(dashDateMatch[2], 10)
      let year = parseInt(dashDateMatch[3], 10)
      if (year < 100) year += 2000
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        date = new Date(year, month - 1, day, 12, 0, 0)
      }
    }
  }

  // Workout name: first meaningful line
  const workoutName = lines.find(l =>
    l.length > 3 &&
    !/^TONAL$/i.test(l) &&
    !/^VOLUME$/i.test(l) &&
    !/^DURATION$/i.test(l) &&
    !/^\d/.test(l) &&
    !l.includes('|') &&
    !l.includes('lbs')
  ) || null

  // Coach/details line with bullet separators
  const detailsLine = lines.find(l => l.includes('•') || l.includes('·')) || null

  const notes = [workoutName, detailsLine].filter(Boolean).join(' — ')

  return { weightLifted, minutes, date, notes }
}
