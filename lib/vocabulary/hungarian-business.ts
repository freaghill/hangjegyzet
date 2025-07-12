import { createClient } from '@/lib/supabase/client'

export type VocabularyCategory = 
  | 'general'
  | 'finance'
  | 'it'
  | 'legal'
  | 'medical'
  | 'marketing'
  | 'hr'
  | 'manufacturing'
  | 'real_estate'
  | 'education'
  | 'government'
  | 'custom'

export interface VocabularyTerm {
  id: string
  organization_id: string
  term: string
  variations?: string[]
  category: VocabularyCategory
  custom_category?: string
  phonetic_hint?: string
  context_hints?: string[]
  usage_count: number
  confidence_score: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface VocabularyLearning {
  id: string
  organization_id: string
  meeting_id?: string
  original_text: string
  corrected_text: string
  term_extracted?: string
  context?: string
  confidence_before?: number
  confidence_after?: number
  created_by: string
  created_at: string
}

export interface SharedVocabulary {
  id: string
  organization_id: string
  name: string
  description?: string
  category: VocabularyCategory
  terms_count: number
  is_public: boolean
  share_token?: string
  created_by: string
  created_at: string
  updated_at: string
}

// Default Hungarian business terms by category
export const DEFAULT_HUNGARIAN_BUSINESS_TERMS: Record<VocabularyCategory, Array<{
  term: string
  variations?: string[]
  phonetic_hint?: string
  context_hints?: string[]
}>> = {
  general: [
    { term: 'üzlet', variations: ['üzleti', 'üzletek'], context_hints: ['megállapodás', 'tárgyalás'] },
    { term: 'vállalat', variations: ['vállalati', 'vállalatok'], context_hints: ['cég', 'szervezet'] },
    { term: 'szerződés', variations: ['szerződéses', 'szerződések'], context_hints: ['megállapodás', 'feltételek'] },
    { term: 'ügyfél', variations: ['ügyfelek', 'ügyfeles'], context_hints: ['vásárló', 'partner'] },
    { term: 'projekt', variations: ['projektek', 'projektes'], context_hints: ['feladat', 'munka'] },
  ],
  finance: [
    { term: 'számla', variations: ['számlák', 'számlázás'], context_hints: ['fizetés', 'díj'] },
    { term: 'árbevétel', variations: ['árbevételek'], context_hints: ['bevétel', 'forgalom'] },
    { term: 'költségvetés', variations: ['költségvetési'], context_hints: ['büdzsé', 'terv'] },
    { term: 'adó', variations: ['adózás', 'adók'], context_hints: ['áfa', 'társasági'] },
    { term: 'befektetés', variations: ['befektetések', 'befektető'], context_hints: ['tőke', 'hozam'] },
    { term: 'likviditás', variations: ['likvid'], context_hints: ['pénzügyi', 'cash flow'] },
    { term: 'amortizáció', variations: ['amortizációs'], context_hints: ['értékcsökkenés', 'leírás'] },
  ],
  it: [
    { term: 'szoftver', variations: ['szoftverek', 'software'], context_hints: ['program', 'alkalmazás'] },
    { term: 'adatbázis', variations: ['adatbázisok'], context_hints: ['database', 'SQL'] },
    { term: 'felhő', variations: ['felhőalapú', 'cloud'], context_hints: ['szolgáltatás', 'tárhely'] },
    { term: 'kiberbiztonsági', variations: ['kiberbiztonság'], context_hints: ['védelem', 'security'] },
    { term: 'algoritmus', variations: ['algoritmusok'], context_hints: ['program', 'megoldás'] },
    { term: 'mesterséges intelligencia', variations: ['AI', 'MI'], context_hints: ['gépi tanulás', 'neurális'] },
  ],
  legal: [
    { term: 'jogszabály', variations: ['jogszabályok', 'jogszabályi'], context_hints: ['törvény', 'rendelet'] },
    { term: 'felelősség', variations: ['felelősségek'], context_hints: ['kártérítés', 'garancia'] },
    { term: 'képviselet', variations: ['képviseleti', 'képviselő'], context_hints: ['meghatalmazás', 'ügyvéd'] },
    { term: 'bíróság', variations: ['bírósági'], context_hints: ['ítélet', 'per'] },
    { term: 'szabályzat', variations: ['szabályzatok'], context_hints: ['előírás', 'policy'] },
  ],
  medical: [
    { term: 'diagnózis', variations: ['diagnózisok'], context_hints: ['betegség', 'vizsgálat'] },
    { term: 'terápia', variations: ['terápiák', 'terápiás'], context_hints: ['kezelés', 'gyógyítás'] },
    { term: 'gyógyszer', variations: ['gyógyszerek', 'gyógyszeres'], context_hints: ['medicina', 'tabletta'] },
    { term: 'páciens', variations: ['páciensek'], context_hints: ['beteg', 'kezelt'] },
  ],
  marketing: [
    { term: 'kampány', variations: ['kampányok'], context_hints: ['hirdetés', 'promóció'] },
    { term: 'célcsoport', variations: ['célcsoportok'], context_hints: ['vásárló', 'szegmens'] },
    { term: 'márka', variations: ['márkák', 'brand'], context_hints: ['termék', 'imázs'] },
    { term: 'konverzió', variations: ['konverziós'], context_hints: ['átalakítás', 'vásárlás'] },
  ],
  hr: [
    { term: 'munkavállaló', variations: ['munkavállalók'], context_hints: ['alkalmazott', 'dolgozó'] },
    { term: 'toborzás', variations: ['toborzási'], context_hints: ['felvétel', 'recruitment'] },
    { term: 'teljesítményértékelés', variations: ['teljesítmény'], context_hints: ['értékelés', 'review'] },
    { term: 'kompetencia', variations: ['kompetenciák'], context_hints: ['képesség', 'skill'] },
  ],
  manufacturing: [
    { term: 'gyártás', variations: ['gyártási', 'gyártó'], context_hints: ['termelés', 'előállítás'] },
    { term: 'minőségbiztosítás', variations: ['minőség'], context_hints: ['ellenőrzés', 'QA'] },
    { term: 'készlet', variations: ['készletek'], context_hints: ['raktár', 'inventory'] },
    { term: 'beszállító', variations: ['beszállítók'], context_hints: ['partner', 'supplier'] },
  ],
  real_estate: [
    { term: 'ingatlan', variations: ['ingatlanok'], context_hints: ['épület', 'telek'] },
    { term: 'bérleti díj', variations: ['bérleti'], context_hints: ['havi', 'költség'] },
    { term: 'tulajdonjog', variations: ['tulajdon'], context_hints: ['birtoklás', 'ownership'] },
    { term: 'értékbecslés', variations: ['értékbecslő'], context_hints: ['ár', 'piaci érték'] },
  ],
  education: [
    { term: 'tanterv', variations: ['tantervek'], context_hints: ['curriculum', 'oktatás'] },
    { term: 'hallgató', variations: ['hallgatók'], context_hints: ['diák', 'tanuló'] },
    { term: 'képzés', variations: ['képzések'], context_hints: ['oktatás', 'training'] },
    { term: 'akkreditáció', variations: ['akkreditált'], context_hints: ['minősítés', 'elismerés'] },
  ],
  government: [
    { term: 'önkormányzat', variations: ['önkormányzati'], context_hints: ['helyi', 'település'] },
    { term: 'határozat', variations: ['határozatok'], context_hints: ['döntés', 'rendelet'] },
    { term: 'közigazgatás', variations: ['közigazgatási'], context_hints: ['hivatal', 'államigazgatás'] },
    { term: 'pályázat', variations: ['pályázatok'], context_hints: ['tender', 'kiírás'] },
  ],
  custom: []
}

export class VocabularyManager {
  private supabase = createClient()

  // Get all vocabulary terms for an organization
  async getTerms(organizationId: string, category?: VocabularyCategory) {
    let query = this.supabase
      .from('vocabulary_terms')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('usage_count', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    const { data, error } = await query

    if (error) throw error
    return data as VocabularyTerm[]
  }

  // Add a new vocabulary term
  async addTerm(term: Partial<VocabularyTerm> & { organization_id: string }) {
    const { data, error } = await this.supabase
      .from('vocabulary_terms')
      .insert({
        ...term,
        term: term.term?.toLowerCase(),
        variations: term.variations?.map(v => v.toLowerCase()),
      })
      .select()
      .single()

    if (error) throw error
    return data as VocabularyTerm
  }

  // Update a vocabulary term
  async updateTerm(id: string, updates: Partial<VocabularyTerm>) {
    const { data, error } = await this.supabase
      .from('vocabulary_terms')
      .update({
        ...updates,
        term: updates.term?.toLowerCase(),
        variations: updates.variations?.map(v => v.toLowerCase()),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as VocabularyTerm
  }

  // Delete a vocabulary term (soft delete)
  async deleteTerm(id: string) {
    const { error } = await this.supabase
      .from('vocabulary_terms')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }

  // Learn from a correction
  async learnFromCorrection(
    organizationId: string,
    meetingId: string | null,
    original: string,
    corrected: string,
    userId: string
  ) {
    const { error } = await this.supabase.rpc('learn_from_correction', {
      org_id: organizationId,
      meeting_id: meetingId,
      original,
      corrected,
      user_id: userId
    })

    if (error) throw error
  }

  // Get learning history
  async getLearningHistory(organizationId: string, limit = 100) {
    const { data, error } = await this.supabase
      .from('vocabulary_learning')
      .select('*, meetings(title)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as (VocabularyLearning & { meetings?: { title: string } })[]
  }

  // Import vocabulary from CSV
  async importFromCSV(
    organizationId: string,
    csvData: string,
    category: VocabularyCategory,
    userId: string
  ) {
    // Parse CSV (simple implementation)
    const lines = csvData.split('\n').filter(line => line.trim())
    const header = lines[0].split(',').map(h => h.trim())
    
    const terms: Partial<VocabularyTerm>[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const term: Partial<VocabularyTerm> = {
        organization_id: organizationId,
        category,
        created_by: userId
      }
      
      header.forEach((col, index) => {
        const value = values[index]
        switch (col.toLowerCase()) {
          case 'term':
            term.term = value.toLowerCase()
            break
          case 'variations':
            term.variations = value.split(';').map(v => v.trim().toLowerCase())
            break
          case 'phonetic':
          case 'phonetic_hint':
            term.phonetic_hint = value
            break
          case 'context':
          case 'context_hints':
            term.context_hints = value.split(';').map(v => v.trim())
            break
          case 'category':
            term.category = value as VocabularyCategory
            break
        }
      })
      
      if (term.term) {
        terms.push(term)
      }
    }

    // Create import record
    const { data: importRecord, error: importError } = await this.supabase
      .from('vocabulary_imports')
      .insert({
        organization_id: organizationId,
        filename: 'csv_import',
        terms_count: terms.length,
        status: 'processing',
        imported_by: userId
      })
      .select()
      .single()

    if (importError) throw importError

    // Batch insert terms
    const { error: termsError } = await this.supabase
      .from('vocabulary_terms')
      .upsert(terms, { onConflict: 'organization_id,term' })

    if (termsError) {
      await this.supabase
        .from('vocabulary_imports')
        .update({
          status: 'failed',
          error_message: termsError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', importRecord.id)
      throw termsError
    }

    // Update import status
    await this.supabase
      .from('vocabulary_imports')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', importRecord.id)

    return importRecord
  }

  // Export vocabulary to CSV
  async exportToCSV(organizationId: string, category?: VocabularyCategory) {
    const terms = await this.getTerms(organizationId, category)
    
    const csv = [
      'term,variations,category,phonetic_hint,context_hints,usage_count,confidence_score',
      ...terms.map(term => [
        term.term,
        term.variations?.join(';') || '',
        term.category,
        term.phonetic_hint || '',
        term.context_hints?.join(';') || '',
        term.usage_count,
        term.confidence_score
      ].join(','))
    ].join('\n')
    
    return csv
  }

  // Create a shared vocabulary
  async createSharedVocabulary(
    organizationId: string,
    name: string,
    description: string,
    category: VocabularyCategory,
    termIds: string[],
    isPublic: boolean,
    userId: string
  ) {
    // Generate share token
    const shareToken = isPublic ? Math.random().toString(36).substring(2, 15) : null

    const { data: sharedVocab, error: sharedError } = await this.supabase
      .from('shared_vocabularies')
      .insert({
        organization_id: organizationId,
        name,
        description,
        category,
        terms_count: termIds.length,
        is_public: isPublic,
        share_token: shareToken,
        created_by: userId
      })
      .select()
      .single()

    if (sharedError) throw sharedError

    // Add terms to shared vocabulary
    const termRelations = termIds.map(termId => ({
      shared_vocabulary_id: sharedVocab.id,
      term_id: termId
    }))

    const { error: termsError } = await this.supabase
      .from('shared_vocabulary_terms')
      .insert(termRelations)

    if (termsError) throw termsError

    return sharedVocab as SharedVocabulary
  }

  // Get shared vocabularies
  async getSharedVocabularies(organizationId: string, includePublic = true) {
    let query = this.supabase
      .from('shared_vocabularies')
      .select('*')

    if (includePublic) {
      query = query.or(`organization_id.eq.${organizationId},is_public.eq.true`)
    } else {
      query = query.eq('organization_id', organizationId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return data as SharedVocabulary[]
  }

  // Import shared vocabulary
  async importSharedVocabulary(
    organizationId: string,
    sharedVocabularyId: string,
    userId: string
  ) {
    // Get terms from shared vocabulary
    const { data: sharedTerms, error: fetchError } = await this.supabase
      .from('shared_vocabulary_terms')
      .select('term_id, vocabulary_terms(*)')
      .eq('shared_vocabulary_id', sharedVocabularyId)

    if (fetchError) throw fetchError

    // Prepare terms for import
    const termsToImport = sharedTerms.map(({ vocabulary_terms }) => ({
      ...vocabulary_terms,
      organization_id: organizationId,
      created_by: userId,
      usage_count: 0,
      confidence_score: 0.8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Import terms
    const { error: importError } = await this.supabase
      .from('vocabulary_terms')
      .upsert(termsToImport, { onConflict: 'organization_id,term' })

    if (importError) throw importError

    return termsToImport.length
  }

  // Initialize default vocabulary for new organizations
  async initializeDefaultVocabulary(organizationId: string, userId: string) {
    const defaultTerms: Partial<VocabularyTerm>[] = []

    Object.entries(DEFAULT_HUNGARIAN_BUSINESS_TERMS).forEach(([category, terms]) => {
      terms.forEach(term => {
        defaultTerms.push({
          organization_id: organizationId,
          term: term.term.toLowerCase(),
          variations: term.variations?.map(v => v.toLowerCase()),
          category: category as VocabularyCategory,
          phonetic_hint: term.phonetic_hint,
          context_hints: term.context_hints,
          usage_count: 0,
          confidence_score: 0.7,
          is_active: true,
          created_by: userId
        })
      })
    })

    const { error } = await this.supabase
      .from('vocabulary_terms')
      .insert(defaultTerms)

    if (error) throw error
  }

  // Get vocabulary suggestions based on context
  async getSuggestions(organizationId: string, context: string, limit = 10) {
    // This would integrate with the transcription service
    // For now, return top terms by usage
    const { data, error } = await this.supabase
      .from('vocabulary_terms')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data as VocabularyTerm[]
  }
}