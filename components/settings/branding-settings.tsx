'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ColorPicker } from '@/components/ui/color-picker'
import { ImageUpload } from '@/components/ui/image-upload'
import { 
  Save, 
  Upload, 
  Palette, 
  Type,
  Building,
  Mail,
  Phone,
  Globe,
  MapPin,
  Eye,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { BrandingOptions } from '@/lib/export/types'

interface BrandingSettingsProps {
  organizationId: string
}

export function BrandingSettings({ organizationId }: BrandingSettingsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [branding, setBranding] = useState<BrandingOptions>({
    companyName: '',
    primaryColor: '#2563eb',
    secondaryColor: '#64748b',
    fontFamily: 'Arial, sans-serif',
    headerText: '',
    footerText: '',
    watermark: false,
    includeContactInfo: true,
    contactInfo: {
      email: '',
      phone: '',
      website: '',
      address: ''
    }
  })

  const supabase = createClient()

  useEffect(() => {
    loadBrandingSettings()
  }, [organizationId])

  const loadBrandingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('name, branding, contact_email, contact_phone, website, address')
        .eq('id', organizationId)
        .single()

      if (error) throw error

      if (data) {
        setBranding({
          companyName: data.name || '',
          ...data.branding,
          contactInfo: {
            email: data.contact_email || '',
            phone: data.contact_phone || '',
            website: data.website || '',
            address: data.address || '',
            ...data.branding?.contactInfo
          }
        })
      }
    } catch (error) {
      console.error('Error loading branding:', error)
      toast.error('Hiba a márkabeállítások betöltésekor')
    } finally {
      setIsLoading(false)
    }
  }

  const saveBrandingSettings = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          branding,
          contact_email: branding.contactInfo?.email,
          contact_phone: branding.contactInfo?.phone,
          website: branding.contactInfo?.website,
          address: branding.contactInfo?.address,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)

      if (error) throw error

      toast.success('Márkabeállítások mentve')
    } catch (error) {
      console.error('Error saving branding:', error)
      toast.error('Hiba a mentés során')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${organizationId}/logo.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('organization-assets')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(fileName)

      setBranding({ ...branding, logoUrl: publicUrl })
      toast.success('Logo feltöltve')
    } catch (error) {
      console.error('Logo upload error:', error)
      toast.error('Hiba a logo feltöltésekor')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Cégadatok
          </CardTitle>
          <CardDescription>
            Alapvető céginformációk az exportált dokumentumokhoz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="companyName">Cégnév</Label>
            <Input
              id="companyName"
              value={branding.companyName}
              onChange={(e) => setBranding({ ...branding, companyName: e.target.value })}
              placeholder="Példa Kft."
            />
          </div>

          <div>
            <Label>Céglogo</Label>
            <ImageUpload
              value={branding.logoUrl}
              onChange={handleLogoUpload}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Ajánlott méret: 300x100px, PNG vagy JPG formátum
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="headerText">Fejléc szöveg (opcionális)</Label>
              <Input
                id="headerText"
                value={branding.headerText || ''}
                onChange={(e) => setBranding({ ...branding, headerText: e.target.value })}
                placeholder="pl. Bizalmas dokumentum"
              />
            </div>
            <div>
              <Label htmlFor="footerText">Lábléc szöveg (opcionális)</Label>
              <Input
                id="footerText"
                value={branding.footerText || ''}
                onChange={(e) => setBranding({ ...branding, footerText: e.target.value })}
                placeholder="pl. © 2024 Példa Kft."
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="watermark"
              checked={branding.watermark || false}
              onCheckedChange={(checked) => setBranding({ ...branding, watermark: checked })}
            />
            <Label htmlFor="watermark" className="cursor-pointer">
              Vízjel megjelenítése a dokumentumokon
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Elérhetőségek</CardTitle>
          <CardDescription>
            Kapcsolattartási információk az exportált dokumentumokhoz
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <Switch
              id="includeContact"
              checked={branding.includeContactInfo || false}
              onCheckedChange={(checked) => setBranding({ ...branding, includeContactInfo: checked })}
            />
            <Label htmlFor="includeContact" className="cursor-pointer">
              Elérhetőségek megjelenítése
            </Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={branding.contactInfo?.email || ''}
                onChange={(e) => setBranding({
                  ...branding,
                  contactInfo: { ...branding.contactInfo, email: e.target.value }
                })}
                placeholder="info@example.hu"
                disabled={!branding.includeContactInfo}
              />
            </div>
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefon
              </Label>
              <Input
                id="phone"
                type="tel"
                value={branding.contactInfo?.phone || ''}
                onChange={(e) => setBranding({
                  ...branding,
                  contactInfo: { ...branding.contactInfo, phone: e.target.value }
                })}
                placeholder="+36 1 234 5678"
                disabled={!branding.includeContactInfo}
              />
            </div>
            <div>
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Weboldal
              </Label>
              <Input
                id="website"
                type="url"
                value={branding.contactInfo?.website || ''}
                onChange={(e) => setBranding({
                  ...branding,
                  contactInfo: { ...branding.contactInfo, website: e.target.value }
                })}
                placeholder="https://example.hu"
                disabled={!branding.includeContactInfo}
              />
            </div>
            <div>
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Cím
              </Label>
              <Input
                id="address"
                value={branding.contactInfo?.address || ''}
                onChange={(e) => setBranding({
                  ...branding,
                  contactInfo: { ...branding.contactInfo, address: e.target.value }
                })}
                placeholder="1234 Budapest, Példa u. 1."
                disabled={!branding.includeContactInfo}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Design Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Megjelenés
          </CardTitle>
          <CardDescription>
            Színek és betűtípusok testreszabása
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primaryColor">Elsődleges szín</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={branding.primaryColor || '#2563eb'}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={branding.primaryColor || '#2563eb'}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Címsorok és kiemelések színe
              </p>
            </div>
            <div>
              <Label htmlFor="secondaryColor">Másodlagos szín</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={branding.secondaryColor || '#64748b'}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={branding.secondaryColor || '#64748b'}
                  onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                  placeholder="#64748b"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Alcímek és metaadatok színe
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="fontFamily" className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Betűtípus
            </Label>
            <select
              id="fontFamily"
              className="w-full mt-2 px-3 py-2 border rounded-md"
              value={branding.fontFamily || 'Arial, sans-serif'}
              onChange={(e) => setBranding({ ...branding, fontFamily: e.target.value })}
            >
              <option value="Arial, sans-serif">Arial</option>
              <option value="Calibri, sans-serif">Calibri</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', monospace">Courier New</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Előnézet
        </Button>
        <Button
          onClick={saveBrandingSettings}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Mentés...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Beállítások mentése
            </>
          )}
        </Button>
      </div>
    </div>
  )
}