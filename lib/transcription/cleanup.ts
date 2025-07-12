interface CleanupOptions {
  removeFillers?: boolean
  fixSpacing?: boolean
  correctCommonErrors?: boolean
  removeRepetitions?: boolean
  enhanceReadability?: boolean
}

export class TranscriptCleaner {
  // Hungarian filler words and sounds
  private readonly fillerWords = [
    'öö', 'ööö', 'hmm', 'hm', 'ühüm', 'áá', 'ááá',
    'izé', 'hogymondjam', 'hogyanmondjam', 'tehát tehát',
    'szóval szóval', 'ugye ugye', 'hát hát'
  ]

  // Common transcription errors in Hungarian
  private readonly commonErrors: Record<string, string> = {
    'nyúl ványi': 'nyilvánvalóan',
    'gépel ni': 'gépelni',
    'meg beszélés': 'megbeszélés',
    'egy ütt': 'együtt',
    'mi helyt': 'mihelyt',
    'egy általán': 'egyáltalán',
    'mind egy': 'mindegy',
    'rend ben': 'rendben',
    'kap csolat': 'kapcsolat',
    'prob léma': 'probléma',
    'meg oldás': 'megoldás',
    'fel adat': 'feladat',
    'követ kező': 'következő',
    'termé szetes': 'természetes',
    'lehe tőség': 'lehetőség',
    'való színű': 'valószínű',
    'egy szerű': 'egyszerű',
    'foly tat': 'folytat',
    'hely zet': 'helyzet',
    'ered mény': 'eredmény',
    'köz pont': 'központ',
    'szer vez': 'szervez',
    'tisz telt': 'tisztelt',
    'ügy fél': 'ügyfél',
    'mun ka': 'munka',
    'pro jekt': 'projekt',
    'rend szer': 'rendszer',
    'szol gál tat ás': 'szolgáltatás',
    'költ ség': 'költség',
    'fej leszt': 'fejleszt',
    'meg valósít': 'megvalósít',
    'kér dés': 'kérdés',
    'vála sz': 'válasz',
    'java sol': 'javasol',
    'dön tés': 'döntés',
    'ülé s': 'ülés',
    'nap i rend': 'napirend'
  }

  // Business terms that are often transcribed incorrectly
  private readonly businessTerms: Record<string, string> = {
    'mítting': 'meeting',
    'míting': 'meeting',
    'dedlájn': 'deadline',
    'riport': 'report',
    'menedzsment': 'management',
    'projekt': 'projekt',
    'ímél': 'email',
    'íméjl': 'email',
    'kol': 'call',
    'konferensz kol': 'conference call',
    'brekdaun': 'breakdown',
    'apszet': 'upset',
    'bilding': 'building',
    'tim': 'team',
    'tím': 'team',
    'líder': 'leader',
    'lídör': 'leader',
    'sztékholder': 'stakeholder',
    'sztékholderek': 'stakeholderek'
  }

  /**
   * Clean transcript with all enhancements
   */
  clean(text: string, options: CleanupOptions = {}): string {
    const defaultOptions: CleanupOptions = {
      removeFillers: true,
      fixSpacing: true,
      correctCommonErrors: true,
      removeRepetitions: true,
      enhanceReadability: true,
      ...options
    }

    let cleaned = text

    if (defaultOptions.removeFillers) {
      cleaned = this.removeFillerWords(cleaned)
    }

    if (defaultOptions.correctCommonErrors) {
      cleaned = this.fixCommonErrors(cleaned)
      cleaned = this.fixBusinessTerms(cleaned)
    }

    if (defaultOptions.removeRepetitions) {
      cleaned = this.removeRepetitions(cleaned)
    }

    if (defaultOptions.fixSpacing) {
      cleaned = this.fixSpacing(cleaned)
    }

    if (defaultOptions.enhanceReadability) {
      cleaned = this.enhanceReadability(cleaned)
    }

    return cleaned.trim()
  }

  /**
   * Remove filler words and sounds
   */
  private removeFillerWords(text: string): string {
    let cleaned = text
    
    // Remove standalone fillers
    this.fillerWords.forEach(filler => {
      // Match filler as whole word with various punctuation
      const regex = new RegExp(`\\b${filler}\\b[,.]?\\s*`, 'gi')
      cleaned = cleaned.replace(regex, '')
    })

    // Remove multiple spaces created by removal
    cleaned = cleaned.replace(/\s+/g, ' ')
    
    // Fix punctuation after removal
    cleaned = cleaned.replace(/\s+([,.])/g, '$1')
    cleaned = cleaned.replace(/^[,.\s]+|[,.\s]+$/g, '')

    return cleaned
  }

  /**
   * Fix common transcription errors
   */
  private fixCommonErrors(text: string): string {
    let cleaned = text

    Object.entries(this.commonErrors).forEach(([error, correct]) => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi')
      cleaned = cleaned.replace(regex, correct)
    })

    return cleaned
  }

  /**
   * Fix business terms
   */
  private fixBusinessTerms(text: string): string {
    let cleaned = text

    Object.entries(this.businessTerms).forEach(([error, correct]) => {
      const regex = new RegExp(`\\b${error}\\b`, 'gi')
      cleaned = cleaned.replace(regex, correct)
    })

    return cleaned
  }

  /**
   * Remove word repetitions
   */
  private removeRepetitions(text: string): string {
    // Remove immediate word repetitions
    let cleaned = text.replace(/\b(\w+)\s+\1\b/gi, '$1')
    
    // Remove phrase repetitions (2-3 words)
    cleaned = cleaned.replace(/\b((?:\w+\s+){1,2}\w+)\s+\1\b/gi, '$1')

    return cleaned
  }

  /**
   * Fix spacing issues
   */
  private fixSpacing(text: string): string {
    let cleaned = text

    // Fix space before punctuation
    cleaned = cleaned.replace(/\s+([,.!?;:])/g, '$1')
    
    // Add space after punctuation if missing
    cleaned = cleaned.replace(/([,.!?;:])([A-Za-zÀ-ÿ])/g, '$1 $2')
    
    // Fix multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ')
    
    // Fix space issues with quotes
    cleaned = cleaned.replace(/"\s+/g, '"')
    cleaned = cleaned.replace(/\s+"/g, '"')

    return cleaned
  }

  /**
   * Enhance readability with better formatting
   */
  private enhanceReadability(text: string): string {
    let cleaned = text

    // Capitalize sentence beginnings
    cleaned = cleaned.replace(/(^|[.!?]\s+)([a-zà-ÿ])/g, (match, p1, p2) => {
      return p1 + p2.toUpperCase()
    })

    // Add periods to likely sentence ends
    cleaned = cleaned.replace(/([a-zà-ÿ])(\s+[A-ZÀ-Ÿ])/g, '$1.$2')

    // Fix common Hungarian capitalization
    const properNouns = ['Budapest', 'Magyarország', 'János', 'Péter', 'László', 'István']
    properNouns.forEach(name => {
      const regex = new RegExp(`\\b${name.toLowerCase()}\\b`, 'gi')
      cleaned = cleaned.replace(regex, name)
    })

    return cleaned
  }

  /**
   * Get cleanup statistics
   */
  getCleanupStats(original: string, cleaned: string): {
    originalLength: number
    cleanedLength: number
    reduction: number
    fillersRemoved: number
    errorsFixed: number
  } {
    const fillersRemoved = (original.match(/\b(öö|ööö|hmm|hm|izé)\b/gi) || []).length
    
    let errorsFixed = 0
    Object.keys(this.commonErrors).forEach(error => {
      const matches = (original.match(new RegExp(`\\b${error}\\b`, 'gi')) || []).length
      errorsFixed += matches
    })

    return {
      originalLength: original.length,
      cleanedLength: cleaned.length,
      reduction: Math.round((1 - cleaned.length / original.length) * 100),
      fillersRemoved,
      errorsFixed
    }
  }
}

// Export singleton instance
export const transcriptCleaner = new TranscriptCleaner()