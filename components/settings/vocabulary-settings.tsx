'use client'

import VocabularyManager from './vocabulary-manager'

interface VocabularySettingsProps {
  organizationId: string
}

export default function VocabularySettings({ organizationId }: VocabularySettingsProps) {
  return <VocabularyManager />
}