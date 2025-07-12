'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ColorPicker } from '@/components/ui/color-picker'
import { Upload, Save, Eye, Download } from 'lucide-react'
import { OrganizationBranding, defaultBranding } from '@/lib/export/branding'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function OrganizationBrandingSettings() {
  const [branding, setBranding] = useState<OrganizationBranding>(defaultBranding)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<any>(null)

  useEffect(() => {
    loadBrandingSettings()
  }, [])

  const loadBrandingSettings = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      // Get user's organization
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization:organizations(*)')
        .eq('user_id', user.id)
        .single()
      
      if (member?.organization) {
        setOrganization(member.organization)
        
        // Load branding settings
        if (member.organization.branding_settings) {
          setBranding({ ...defaultBranding, ...member.organization.branding_settings })
        }
      }
    } catch (error) {
      console.error('Failed to load branding settings:', error)
      toast.error('Nem sikerült betölteni a márkabeállításokat')
    } finally {
      setLoading(false)
    }
  }

  const saveBrandingSettings = async () => {
    if (!organization) return
    
    setSaving(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('organizations')
        .update({ branding_settings: branding })
        .eq('id', organization.id)
      
      if (error) throw error
      
      toast.success('Márkabeállítások mentve')
    } catch (error) {
      console.error('Failed to save branding settings:', error)
      toast.error('Nem sikerült menteni a márkabeállításokat')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !organization) return
    
    try {
      const supabase = createClient()
      
      // Upload logo
      const fileName = `${organization.id}/logo-${Date.now()}.${file.name.split('.').pop()}`
      const { data, error } = await supabase.storage
        .from('branding')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })
      
      if (error) throw error
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName)
      
      // Update branding
      setBranding({
        ...branding,
        logo: {
          ...branding.logo,
          url: publicUrl
        }
      })
      
      toast.success('Logó feltöltve')
    } catch (error) {
      console.error('Logo upload failed:', error)
      toast.error('Nem sikerült feltölteni a logót')
    }
  }

  const previewBrandedPDF = async () => {
    // This would generate a preview PDF with current branding settings
    toast.info('PDF előnézet generálása...')
    // Implementation would call an API endpoint to generate a sample PDF
  }

  if (loading) {
    return <div>Betöltés...</div>
  }

  if (!organization) {
    return <div>Nincs szervezet társítva a fiókjához</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Szervezeti márkabeállítások</CardTitle>
          <CardDescription>
            Testreszabhatja a PDF exportok és email sablonok megjelenését
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="visual" className="space-y-4">
            <TabsList>
              <TabsTrigger value="visual">Vizuális</TabsTrigger>
              <TabsTrigger value="header-footer">Fejléc/Lábléc</TabsTrigger>
              <TabsTrigger value="document">Dokumentum</TabsTrigger>
            </TabsList>
            
            <TabsContent value="visual" className="space-y-4">
              {/* Logo Section */}
              <div className="space-y-2">
                <Label>Szervezeti logó</Label>
                <div className="flex items-center gap-4">
                  {branding.logo?.url && (
                    <img 
                      src={branding.logo.url} 
                      alt="Logo" 
                      className="h-16 object-contain"
                    />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="max-w-xs"
                  />
                </div>
              </div>
              
              {/* Colors Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Színek</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Elsődleges szín</Label>
                    <Input
                      type="color"
                      value={branding.colors?.primary || '#2563eb'}
                      onChange={(e) => setBranding({
                        ...branding,
                        colors: { ...branding.colors, primary: e.target.value }
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Másodlagos szín</Label>
                    <Input
                      type="color"
                      value={branding.colors?.secondary || '#64748b'}
                      onChange={(e) => setBranding({
                        ...branding,
                        colors: { ...branding.colors, secondary: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
              
              {/* Typography Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Betűtípusok</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Címsor betűtípus</Label>
                    <Input
                      value={branding.fonts?.heading || 'Inter'}
                      onChange={(e) => setBranding({
                        ...branding,
                        fonts: { ...branding.fonts, heading: e.target.value }
                      })}
                      placeholder="pl. Inter, Arial"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Szöveg betűtípus</Label>
                    <Input
                      value={branding.fonts?.body || 'Inter'}
                      onChange={(e) => setBranding({
                        ...branding,
                        fonts: { ...branding.fonts, body: e.target.value }
                      })}
                      placeholder="pl. Inter, Arial"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="header-footer" className="space-y-4">
              {/* Header Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Fejléc</h3>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={branding.header?.show ?? true}
                    onCheckedChange={(checked) => setBranding({
                      ...branding,
                      header: { ...branding.header, show: checked }
                    })}
                  />
                  <Label>Fejléc megjelenítése</Label>
                </div>
                
                {branding.header?.show && (
                  <>
                    <div className="space-y-2">
                      <Label>Fejléc szöveg</Label>
                      <Input
                        value={branding.header?.text || ''}
                        onChange={(e) => setBranding({
                          ...branding,
                          header: { ...branding.header, text: e.target.value }
                        })}
                        placeholder="pl. Bizalmas dokumentum"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={branding.header?.includePageNumbers ?? true}
                        onCheckedChange={(checked) => setBranding({
                          ...branding,
                          header: { ...branding.header, includePageNumbers: checked }
                        })}
                      />
                      <Label>Oldalszámozás</Label>
                    </div>
                  </>
                )}
              </div>
              
              {/* Footer Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Lábléc</h3>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={branding.footer?.show ?? true}
                    onCheckedChange={(checked) => setBranding({
                      ...branding,
                      footer: { ...branding.footer, show: checked }
                    })}
                  />
                  <Label>Lábléc megjelenítése</Label>
                </div>
                
                {branding.footer?.show && (
                  <>
                    <div className="space-y-2">
                      <Label>Lábléc szöveg</Label>
                      <Input
                        value={branding.footer?.text || ''}
                        onChange={(e) => setBranding({
                          ...branding,
                          footer: { ...branding.footer, text: e.target.value }
                        })}
                        placeholder="pl. © 2024 Cégünk Kft."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Egyéni szöveg</Label>
                      <Input
                        value={branding.footer?.customText || ''}
                        onChange={(e) => setBranding({
                          ...branding,
                          footer: { ...branding.footer, customText: e.target.value }
                        })}
                        placeholder="pl. Minden jog fenntartva"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={branding.footer?.includeDate ?? true}
                        onCheckedChange={(checked) => setBranding({
                          ...branding,
                          footer: { ...branding.footer, includeDate: checked }
                        })}
                      />
                      <Label>Dátum megjelenítése</Label>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="document" className="space-y-4">
              {/* Document Settings */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Vízjel szöveg</Label>
                  <Input
                    value={branding.document?.watermark || ''}
                    onChange={(e) => setBranding({
                      ...branding,
                      document: { ...branding.document, watermark: e.target.value }
                    })}
                    placeholder="pl. BIZALMAS"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Vízjel átlátszóság</Label>
                  <Input
                    type="range"
                    min="0"
                    max="0.3"
                    step="0.05"
                    value={branding.document?.watermarkOpacity || 0.05}
                    onChange={(e) => setBranding({
                      ...branding,
                      document: { ...branding.document, watermarkOpacity: parseFloat(e.target.value) }
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Bizalmassági figyelmeztetés</Label>
                  <Input
                    value={branding.document?.confidentialityNotice || ''}
                    onChange={(e) => setBranding({
                      ...branding,
                      document: { ...branding.document, confidentialityNotice: e.target.value }
                    })}
                    placeholder="pl. Ez a dokumentum bizalmas információkat tartalmaz"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={previewBrandedPDF}
              disabled={saving}
            >
              <Eye className="mr-2 h-4 w-4" />
              Előnézet
            </Button>
            
            <Button
              onClick={saveBrandingSettings}
              disabled={saving}
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Mentés...' : 'Mentés'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}