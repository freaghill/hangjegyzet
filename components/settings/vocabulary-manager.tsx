'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Download, Upload, Share2, Trash2, Edit2, BookOpen, History, Search } from 'lucide-react'
import { VocabularyTerm, VocabularyCategory, VocabularyLearning } from '@/lib/vocabulary/hungarian-business'

const categoryLabels: Record<VocabularyCategory, string> = {
  general: 'Általános',
  finance: 'Pénzügy',
  it: 'IT',
  legal: 'Jogi',
  medical: 'Egészségügy',
  marketing: 'Marketing',
  hr: 'HR',
  manufacturing: 'Gyártás',
  real_estate: 'Ingatlan',
  education: 'Oktatás',
  government: 'Kormányzat',
  custom: 'Egyéni'
}

export function VocabularyManager() {
  const [terms, setTerms] = useState<VocabularyTerm[]>([])
  const [learningHistory, setLearningHistory] = useState<VocabularyLearning[]>([])
  const [selectedCategory, setSelectedCategory] = useState<VocabularyCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [selectedTerm, setSelectedTerm] = useState<VocabularyTerm | null>(null)
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [formData, setFormData] = useState({
    term: '',
    variations: '',
    category: 'general' as VocabularyCategory,
    customCategory: '',
    phoneticHint: '',
    contextHints: ''
  })

  const [shareFormData, setShareFormData] = useState({
    name: '',
    description: '',
    category: 'general' as VocabularyCategory,
    isPublic: false
  })

  useEffect(() => {
    fetchTerms()
    fetchLearningHistory()
  }, [selectedCategory])

  const fetchTerms = async () => {
    try {
      setIsLoading(true)
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : ''
      const response = await fetch(`/api/vocabulary${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setTerms(data.terms)
      } else {
        toast.error('Nem sikerült betölteni a szókészletet')
      }
    } catch (error) {
      toast.error('Hiba történt a szókészlet betöltése során')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLearningHistory = async () => {
    try {
      const response = await fetch('/api/vocabulary/learn')
      const data = await response.json()
      
      if (response.ok) {
        setLearningHistory(data.history)
      }
    } catch (error) {
      console.error('Error fetching learning history:', error)
    }
  }

  const handleAddTerm = async () => {
    try {
      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variations: formData.variations.split(',').map(v => v.trim()).filter(v => v),
          contextHints: formData.contextHints.split(',').map(v => v.trim()).filter(v => v)
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Kifejezés sikeresen hozzáadva')
        setTerms([...terms, data.term])
        setIsAddDialogOpen(false)
        resetForm()
      } else {
        toast.error(data.error || 'Nem sikerült hozzáadni a kifejezést')
      }
    } catch (error) {
      toast.error('Hiba történt a kifejezés hozzáadása során')
    }
  }

  const handleUpdateTerm = async () => {
    if (!selectedTerm) return

    try {
      const response = await fetch('/api/vocabulary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTerm.id,
          ...formData,
          variations: formData.variations.split(',').map(v => v.trim()).filter(v => v),
          contextHints: formData.contextHints.split(',').map(v => v.trim()).filter(v => v)
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Kifejezés sikeresen frissítve')
        setTerms(terms.map(t => t.id === selectedTerm.id ? data.term : t))
        setIsEditDialogOpen(false)
        resetForm()
      } else {
        toast.error(data.error || 'Nem sikerült frissíteni a kifejezést')
      }
    } catch (error) {
      toast.error('Hiba történt a kifejezés frissítése során')
    }
  }

  const handleDeleteTerm = async (id: string) => {
    if (!confirm('Biztosan törölni szeretné ezt a kifejezést?')) return

    try {
      const response = await fetch(`/api/vocabulary?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Kifejezés sikeresen törölve')
        setTerms(terms.filter(t => t.id !== id))
      } else {
        toast.error('Nem sikerült törölni a kifejezést')
      }
    } catch (error) {
      toast.error('Hiba történt a kifejezés törlése során')
    }
  }

  const handleExport = async () => {
    try {
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : ''
      const response = await fetch(`/api/vocabulary/export${params}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vocabulary-${selectedCategory}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Szókészlet sikeresen exportálva')
      } else {
        toast.error('Nem sikerült exportálni a szókészletet')
      }
    } catch (error) {
      toast.error('Hiba történt az exportálás során')
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file size (10MB limit for CSV files)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error(`A fájl túl nagy. Maximum 10MB engedélyezett, a feltöltött fájl ${Math.round(file.size / 1024 / 1024)}MB`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('Csak CSV fájlok tölthetők fel')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', selectedCategory === 'all' ? 'general' : selectedCategory)

    try {
      const response = await fetch('/api/vocabulary/export', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success(`${data.termsCount} kifejezés sikeresen importálva`)
        fetchTerms()
      } else {
        toast.error(data.error || 'Nem sikerült importálni a fájlt')
      }
    } catch (error) {
      toast.error('Hiba történt az importálás során')
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleShare = async () => {
    if (selectedTermIds.length === 0) {
      toast.error('Válasszon ki legalább egy kifejezést a megosztáshoz')
      return
    }

    try {
      const response = await fetch('/api/vocabulary/export', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...shareFormData,
          termIds: selectedTermIds
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        toast.success('Szókészlet sikeresen megosztva')
        if (data.sharedVocabulary.share_token) {
          toast.success(`Megosztási token: ${data.sharedVocabulary.share_token}`)
        }
        setIsShareDialogOpen(false)
        setSelectedTermIds([])
        resetShareForm()
      } else {
        toast.error(data.error || 'Nem sikerült megosztani a szókészletet')
      }
    } catch (error) {
      toast.error('Hiba történt a megosztás során')
    }
  }

  const resetForm = () => {
    setFormData({
      term: '',
      variations: '',
      category: 'general',
      customCategory: '',
      phoneticHint: '',
      contextHints: ''
    })
    setSelectedTerm(null)
  }

  const resetShareForm = () => {
    setShareFormData({
      name: '',
      description: '',
      category: 'general',
      isPublic: false
    })
  }

  const openEditDialog = (term: VocabularyTerm) => {
    setSelectedTerm(term)
    setFormData({
      term: term.term,
      variations: term.variations?.join(', ') || '',
      category: term.category,
      customCategory: term.custom_category || '',
      phoneticHint: term.phonetic_hint || '',
      contextHints: term.context_hints?.join(', ') || ''
    })
    setIsEditDialogOpen(true)
  }

  const filteredTerms = terms.filter(term => 
    term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    term.variations?.some(v => v.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <Tabs defaultValue="terms" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="terms">Szókészlet</TabsTrigger>
          <TabsTrigger value="learning">Tanulási előzmények</TabsTrigger>
          <TabsTrigger value="shared">Megosztott szókészletek</TabsTrigger>
        </TabsList>

        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Üzleti szókészlet</CardTitle>
                  <CardDescription>
                    Kezelje szervezete egyedi kifejezéseit a pontosabb átírásért
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Új kifejezés
                  </Button>
                  <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportálás
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Importálás
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => setIsShareDialogOpen(true)} 
                    variant="outline" 
                    size="sm"
                    disabled={selectedTermIds.length === 0}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Megosztás ({selectedTermIds.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Keresés a kifejezések között..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) => setSelectedCategory(value as VocabularyCategory | 'all')}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Kategória" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Minden kategória</SelectItem>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 w-8">
                        <input
                          type="checkbox"
                          checked={selectedTermIds.length === filteredTerms.length && filteredTerms.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTermIds(filteredTerms.map(t => t.id))
                            } else {
                              setSelectedTermIds([])
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-4">Kifejezés</th>
                      <th className="text-left p-4">Variációk</th>
                      <th className="text-left p-4">Kategória</th>
                      <th className="text-left p-4">Használat</th>
                      <th className="text-left p-4">Megbízhatóság</th>
                      <th className="text-left p-4">Műveletek</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-muted-foreground">
                          Betöltés...
                        </td>
                      </tr>
                    ) : filteredTerms.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center p-8 text-muted-foreground">
                          Nincs találat
                        </td>
                      </tr>
                    ) : (
                      filteredTerms.map((term) => (
                        <tr key={term.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={selectedTermIds.includes(term.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTermIds([...selectedTermIds, term.id])
                                } else {
                                  setSelectedTermIds(selectedTermIds.filter(id => id !== term.id))
                                }
                              }}
                            />
                          </td>
                          <td className="p-4 font-medium">{term.term}</td>
                          <td className="p-4">
                            {term.variations?.map((v, i) => (
                              <Badge key={i} variant="secondary" className="mr-1 mb-1">
                                {v}
                              </Badge>
                            ))}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">
                              {categoryLabels[term.category]}
                            </Badge>
                          </td>
                          <td className="p-4">{term.usage_count}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${term.confidence_score * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {Math.round(term.confidence_score * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button
                                onClick={() => openEditDialog(term)}
                                variant="ghost"
                                size="sm"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteTerm(term.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tanulási előzmények</CardTitle>
              <CardDescription>
                A rendszer által tanult javítások és kifejezések
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {learningHistory.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Még nincsenek tanulási előzmények
                  </p>
                ) : (
                  learningHistory.map((entry) => (
                    <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString('hu-HU')}
                          </span>
                          {entry.meetings && (
                            <Badge variant="secondary">
                              {entry.meetings.title}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <div>
                          <span className="text-sm font-medium">Eredeti:</span>
                          <p className="text-sm text-muted-foreground">{entry.original_text}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Javított:</span>
                          <p className="text-sm">{entry.corrected_text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shared" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Megosztott szókészletek</CardTitle>
              <CardDescription>
                Böngésszen és importáljon más szervezetek által megosztott szókészleteket
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">
                Hamarosan elérhető
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Term Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Új kifejezés hozzáadása</DialogTitle>
            <DialogDescription>
              Adjon hozzá egy új kifejezést a szervezete szókészletéhez
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="term">Kifejezés *</Label>
              <Input
                id="term"
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                placeholder="pl. árbevétel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="variations">Variációk (vesszővel elválasztva)</Label>
              <Input
                id="variations"
                value={formData.variations}
                onChange={(e) => setFormData({ ...formData, variations: e.target.value })}
                placeholder="pl. árbevételek, árbevételi"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Kategória</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as VocabularyCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.category === 'custom' && (
              <div className="grid gap-2">
                <Label htmlFor="customCategory">Egyéni kategória neve</Label>
                <Input
                  id="customCategory"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="phoneticHint">Fonetikus segítség</Label>
              <Input
                id="phoneticHint"
                value={formData.phoneticHint}
                onChange={(e) => setFormData({ ...formData, phoneticHint: e.target.value })}
                placeholder="Kiejtési segítség"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contextHints">Kontextus kulcsszavak (vesszővel elválasztva)</Label>
              <Input
                id="contextHints"
                value={formData.contextHints}
                onChange={(e) => setFormData({ ...formData, contextHints: e.target.value })}
                placeholder="pl. bevétel, forgalom"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleAddTerm}>
              Hozzáadás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Term Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Kifejezés szerkesztése</DialogTitle>
            <DialogDescription>
              Módosítsa a kiválasztott kifejezés adatait
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-term">Kifejezés *</Label>
              <Input
                id="edit-term"
                value={formData.term}
                onChange={(e) => setFormData({ ...formData, term: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-variations">Variációk (vesszővel elválasztva)</Label>
              <Input
                id="edit-variations"
                value={formData.variations}
                onChange={(e) => setFormData({ ...formData, variations: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-category">Kategória</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as VocabularyCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.category === 'custom' && (
              <div className="grid gap-2">
                <Label htmlFor="edit-customCategory">Egyéni kategória neve</Label>
                <Input
                  id="edit-customCategory"
                  value={formData.customCategory}
                  onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-phoneticHint">Fonetikus segítség</Label>
              <Input
                id="edit-phoneticHint"
                value={formData.phoneticHint}
                onChange={(e) => setFormData({ ...formData, phoneticHint: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contextHints">Kontextus kulcsszavak (vesszővel elválasztva)</Label>
              <Input
                id="edit-contextHints"
                value={formData.contextHints}
                onChange={(e) => setFormData({ ...formData, contextHints: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleUpdateTerm}>
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Vocabulary Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Szókészlet megosztása</DialogTitle>
            <DialogDescription>
              Ossza meg a kiválasztott kifejezéseket más szervezetekkel
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="share-name">Megosztás neve *</Label>
              <Input
                id="share-name"
                value={shareFormData.name}
                onChange={(e) => setShareFormData({ ...shareFormData, name: e.target.value })}
                placeholder="pl. Pénzügyi alapkifejezések"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="share-description">Leírás</Label>
              <Input
                id="share-description"
                value={shareFormData.description}
                onChange={(e) => setShareFormData({ ...shareFormData, description: e.target.value })}
                placeholder="Rövid leírás a szókészletről"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="share-category">Kategória</Label>
              <Select
                value={shareFormData.category}
                onValueChange={(value) => setShareFormData({ ...shareFormData, category: value as VocabularyCategory })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="share-public">Nyilvános megosztás</Label>
                <p className="text-sm text-muted-foreground">
                  Más szervezetek is hozzáférhetnek
                </p>
              </div>
              <Switch
                id="share-public"
                checked={shareFormData.isPublic}
                onCheckedChange={(checked) => setShareFormData({ ...shareFormData, isPublic: checked })}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedTermIds.length} kifejezés kiválasztva
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleShare}>
              Megosztás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default VocabularyManager