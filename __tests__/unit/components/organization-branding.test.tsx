import { render, screen, fireEvent, waitFor } from '@/test/utils/test-utils'
import { OrganizationBrandingSettings } from '@/components/settings/organization-branding'
import { createMockSupabaseClient } from '@/test/utils/supabase-mock'
import { createMockOrganization, createMockUser, createMockBranding } from '@/test/utils/factories'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

describe('OrganizationBrandingSettings', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabase = createMockSupabaseClient()
    require('@/lib/supabase/client').createClient.mockReturnValue(mockSupabase)
    
    // Mock user and organization
    const mockUser = createMockUser()
    const mockOrg = createMockOrganization({
      branding_settings: createMockBranding(),
    })
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    
    mockSupabase.from('organization_members').select.mockReturnThis()
    mockSupabase.from('organization_members').eq.mockReturnThis()
    mockSupabase.from('organization_members').single.mockResolvedValue({
      data: { organization: mockOrg },
      error: null,
    })
  })
  
  it('should load and display branding settings', async () => {
    render(<OrganizationBrandingSettings />)
    
    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Szervezeti márkabeállítások')).toBeInTheDocument()
    })
    
    // Check if tabs are rendered
    expect(screen.getByText('Vizuális')).toBeInTheDocument()
    expect(screen.getByText('Fejléc/Lábléc')).toBeInTheDocument()
    expect(screen.getByText('Dokumentum')).toBeInTheDocument()
  })
  
  it('should update color settings', async () => {
    render(<OrganizationBrandingSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Elsődleges szín')).toBeInTheDocument()
    })
    
    // Find and update primary color input
    const primaryColorInput = screen.getByLabelText('Elsődleges szín')
    fireEvent.change(primaryColorInput, { target: { value: '#ff0000' } })
    
    // Save settings
    const saveButton = screen.getByText('Mentés')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockSupabase.from('organizations').update).toHaveBeenCalledWith(
        expect.objectContaining({
          branding_settings: expect.objectContaining({
            colors: expect.objectContaining({
              primary: '#ff0000',
            }),
          }),
        })
      )
    })
    
    expect(toast.success).toHaveBeenCalledWith('Márkabeállítások mentve')
  })
  
  it('should handle logo upload', async () => {
    render(<OrganizationBrandingSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Szervezeti logó')).toBeInTheDocument()
    })
    
    // Mock file upload
    const file = new File(['logo'], 'logo.png', { type: 'image/png' })
    const fileInput = screen.getByLabelText('Szervezeti logó')
    
    mockSupabase.storage.from('branding').upload.mockResolvedValue({
      data: { path: 'org-123/logo.png' },
      error: null,
    })
    
    mockSupabase.storage.from('branding').getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/logo.png' },
    })
    
    // Upload file
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(mockSupabase.storage.from('branding').upload).toHaveBeenCalledWith(
        expect.stringContaining('logo'),
        file,
        expect.any(Object)
      )
    })
    
    expect(toast.success).toHaveBeenCalledWith('Logó feltöltve')
  })
  
  it('should toggle header and footer settings', async () => {
    render(<OrganizationBrandingSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Fejléc/Lábléc')).toBeInTheDocument()
    })
    
    // Switch to header/footer tab
    fireEvent.click(screen.getByText('Fejléc/Lábléc'))
    
    // Toggle header display
    const headerSwitch = screen.getByLabelText('Fejléc megjelenítése')
    fireEvent.click(headerSwitch)
    
    // Header fields should be hidden
    expect(screen.queryByLabelText('Fejléc szöveg')).not.toBeInTheDocument()
    
    // Toggle back
    fireEvent.click(headerSwitch)
    
    // Header fields should be visible
    await waitFor(() => {
      expect(screen.getByLabelText('Fejléc szöveg')).toBeInTheDocument()
    })
  })
  
  it('should update watermark settings', async () => {
    render(<OrganizationBrandingSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Dokumentum')).toBeInTheDocument()
    })
    
    // Switch to document tab
    fireEvent.click(screen.getByText('Dokumentum'))
    
    // Update watermark
    const watermarkInput = screen.getByLabelText('Vízjel szöveg')
    fireEvent.change(watermarkInput, { target: { value: 'CONFIDENTIAL' } })
    
    // Update opacity
    const opacityInput = screen.getByLabelText('Vízjel átlátszóság')
    fireEvent.change(opacityInput, { target: { value: '0.1' } })
    
    // Save
    const saveButton = screen.getByText('Mentés')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockSupabase.from('organizations').update).toHaveBeenCalledWith(
        expect.objectContaining({
          branding_settings: expect.objectContaining({
            document: expect.objectContaining({
              watermark: 'CONFIDENTIAL',
              watermarkOpacity: 0.1,
            }),
          }),
        })
      )
    })
  })
  
  it('should show preview button', async () => {
    render(<OrganizationBrandingSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Előnézet')).toBeInTheDocument()
    })
    
    const previewButton = screen.getByText('Előnézet')
    fireEvent.click(previewButton)
    
    expect(toast.info).toHaveBeenCalledWith('PDF előnézet generálása...')
  })
  
  it('should handle save errors gracefully', async () => {
    render(<OrganizationBrandingSettings />)
    
    await waitFor(() => {
      expect(screen.getByText('Mentés')).toBeInTheDocument()
    })
    
    // Mock save error
    mockSupabase.from('organizations').update.mockReturnThis()
    mockSupabase.from('organizations').eq.mockResolvedValue({
      error: { message: 'Update failed' },
    })
    
    const saveButton = screen.getByText('Mentés')
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nem sikerült menteni a márkabeállításokat')
    })
  })
})