/**
 * Accuracy metrics for transcription validation
 * Implements WER (Word Error Rate) and CER (Character Error Rate)
 */

/**
 * Calculate Word Error Rate (WER)
 * WER = (S + D + I) / N
 * where S = substitutions, D = deletions, I = insertions, N = reference length
 */
export function calculateWER(reference: string, hypothesis: string): number {
  const refWords = normalizeText(reference).split(/\s+/).filter(w => w.length > 0)
  const hypWords = normalizeText(hypothesis).split(/\s+/).filter(w => w.length > 0)
  
  if (refWords.length === 0) return hypWords.length > 0 ? 1 : 0
  
  const distance = levenshteinDistance(refWords, hypWords)
  return Math.min(distance / refWords.length, 1)
}

/**
 * Calculate Character Error Rate (CER)
 * Similar to WER but at character level
 */
export function calculateCER(reference: string, hypothesis: string): number {
  const refChars = normalizeText(reference).split('')
  const hypChars = normalizeText(hypothesis).split('')
  
  if (refChars.length === 0) return hypChars.length > 0 ? 1 : 0
  
  const distance = levenshteinDistance(refChars, hypChars)
  return Math.min(distance / refChars.length, 1)
}

/**
 * Calculate semantic similarity score
 * Uses word overlap and synonyms for Hungarian
 */
export function calculateSemanticSimilarity(reference: string, hypothesis: string): number {
  const refWords = new Set(normalizeText(reference).split(/\s+/))
  const hypWords = new Set(normalizeText(hypothesis).split(/\s+/))
  
  // Expand with common Hungarian synonyms
  const expandedRef = expandWithSynonyms(refWords)
  const expandedHyp = expandWithSynonyms(hypWords)
  
  const intersection = new Set([...expandedRef].filter(x => expandedHyp.has(x)))
  const union = new Set([...expandedRef, ...expandedHyp])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Calculate confidence score based on multiple metrics
 */
export function calculateConfidenceScore(metrics: {
  wer: number
  cer: number
  semanticSimilarity: number
  audioQuality?: number
}): number {
  // Weighted combination of metrics
  const werScore = 1 - metrics.wer
  const cerScore = 1 - metrics.cer
  const semanticScore = metrics.semanticSimilarity
  const audioScore = metrics.audioQuality || 0.8
  
  // Weights
  const weights = {
    wer: 0.4,
    cer: 0.2,
    semantic: 0.3,
    audio: 0.1
  }
  
  const confidence = 
    werScore * weights.wer +
    cerScore * weights.cer +
    semanticScore * weights.semantic +
    audioScore * weights.audio
  
  return Math.max(0, Math.min(1, confidence))
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Calculate Levenshtein distance between two arrays
 */
function levenshteinDistance<T>(a: T[], b: T[]): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  // Initialize base cases
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  
  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        )
      }
    }
  }
  
  return dp[m][n]
}

/**
 * Expand word set with common Hungarian synonyms
 */
function expandWithSynonyms(words: Set<string>): Set<string> {
  const expanded = new Set(words)
  
  // Common Hungarian synonyms and variations
  const synonymMap: Record<string, string[]> = {
    'igen': ['persze', 'természetesen', 'hogyne'],
    'nem': ['dehogy', 'semmiképp'],
    'köszönöm': ['köszi', 'köszönöm szépen', 'köszönet'],
    'meeting': ['megbeszélés', 'értekezlet', 'találkozó'],
    'projekt': ['project', 'feladat'],
    // Add more domain-specific synonyms
  }
  
  for (const word of words) {
    if (synonymMap[word]) {
      synonymMap[word].forEach(syn => expanded.add(syn))
    }
    // Also check reverse mapping
    for (const [key, syns] of Object.entries(synonymMap)) {
      if (syns.includes(word)) {
        expanded.add(key)
      }
    }
  }
  
  return expanded
}

/**
 * Detailed error analysis
 */
export interface ErrorAnalysis {
  totalErrors: number
  substitutions: number
  deletions: number
  insertions: number
  errorRate: number
  commonErrors: Array<{
    expected: string
    actual: string
    count: number
  }>
}

export function analyzeErrors(reference: string, hypothesis: string): ErrorAnalysis {
  const refWords = normalizeText(reference).split(/\s+/)
  const hypWords = normalizeText(hypothesis).split(/\s+/)
  
  // Align sequences and identify errors
  const alignment = alignSequences(refWords, hypWords)
  
  let substitutions = 0
  let deletions = 0
  let insertions = 0
  const errorPairs: Map<string, number> = new Map()
  
  for (const [refWord, hypWord] of alignment) {
    if (refWord === null && hypWord !== null) {
      insertions++
    } else if (refWord !== null && hypWord === null) {
      deletions++
    } else if (refWord !== hypWord) {
      substitutions++
      const key = `${refWord}→${hypWord}`
      errorPairs.set(key, (errorPairs.get(key) || 0) + 1)
    }
  }
  
  const totalErrors = substitutions + deletions + insertions
  const errorRate = refWords.length > 0 ? totalErrors / refWords.length : 0
  
  // Get most common errors
  const commonErrors = Array.from(errorPairs.entries())
    .map(([pair, count]) => {
      const [expected, actual] = pair.split('→')
      return { expected, actual, count }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return {
    totalErrors,
    substitutions,
    deletions,
    insertions,
    errorRate,
    commonErrors
  }
}

/**
 * Align two sequences for error analysis
 */
function alignSequences<T>(a: T[], b: T[]): Array<[T | null, T | null]> {
  const m = a.length
  const n = b.length
  const alignment: Array<[T | null, T | null]> = []
  
  // Use dynamic programming to find optimal alignment
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  const backtrack: string[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(''))
  
  // Initialize
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i
    backtrack[i][0] = 'D'
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
    backtrack[0][j] = 'I'
  }
  backtrack[0][0] = ''
  
  // Fill tables
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
        backtrack[i][j] = 'M'
      } else {
        const costs = [
          { cost: dp[i - 1][j] + 1, op: 'D' },     // deletion
          { cost: dp[i][j - 1] + 1, op: 'I' },     // insertion
          { cost: dp[i - 1][j - 1] + 1, op: 'S' }  // substitution
        ]
        const min = costs.reduce((min, curr) => curr.cost < min.cost ? curr : min)
        dp[i][j] = min.cost
        backtrack[i][j] = min.op
      }
    }
  }
  
  // Reconstruct alignment
  let i = m, j = n
  const reversedAlignment: Array<[T | null, T | null]> = []
  
  while (i > 0 || j > 0) {
    const op = backtrack[i][j]
    
    if (op === 'M' || op === 'S') {
      reversedAlignment.push([a[i - 1], b[j - 1]])
      i--
      j--
    } else if (op === 'D') {
      reversedAlignment.push([a[i - 1], null])
      i--
    } else if (op === 'I') {
      reversedAlignment.push([null, b[j - 1]])
      j--
    }
  }
  
  return reversedAlignment.reverse()
}