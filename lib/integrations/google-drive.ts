import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { createClient } from '@/lib/supabase/server'

export interface GoogleDriveFolder {
  id: string
  name: string
  lastSyncedAt?: string
}

export interface GoogleDriveTokens {
  access_token?: string | null
  refresh_token?: string | null
  expiry_date?: number | null
  scope?: string
  token_type?: string
}

export class GoogleDriveIntegration {
  private oauth2Client: OAuth2Client

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
  }

  /**
   * Get authorization URL for user to grant permissions
   */
  getAuthUrl(state: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state, // Pass organization ID or user ID for security
      prompt: 'consent',
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code)
    return tokens
  }

  /**
   * Create Drive client with user tokens
   */
  getDriveClient(tokens: GoogleDriveTokens) {
    this.oauth2Client.setCredentials(tokens)
    return google.drive({ version: 'v3', auth: this.oauth2Client })
  }

  /**
   * List audio/video files from a folder
   */
  async listAudioVideoFiles(tokens: GoogleDriveTokens, folderId?: string) {
    const drive = this.getDriveClient(tokens)
    
    const query = [
      `(mimeType contains 'audio/' or mimeType contains 'video/')`,
      `trashed = false`,
      folderId ? `'${folderId}' in parents` : null,
    ].filter(Boolean).join(' and ')

    const response = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, createdTime, webViewLink)',
      pageSize: 100,
      orderBy: 'createdTime desc',
    })

    return response.data.files || []
  }

  /**
   * Get file for download/streaming
   */
  async getFileStream(tokens: GoogleDriveTokens, fileId: string) {
    const drive = this.getDriveClient(tokens)
    
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )
    
    return response.data
  }

  /**
   * Watch a folder for changes
   */
  async watchFolder(tokens: GoogleDriveTokens, folderId: string, webhookUrl: string) {
    const drive = this.getDriveClient(tokens)
    
    const response = await drive.files.watch({
      fileId: folderId,
      requestBody: {
        id: `folder-${folderId}-${Date.now()}`,
        type: 'web_hook',
        address: webhookUrl,
        expiration: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })

    return response.data
  }

  /**
   * List folders in Google Drive
   */
  async listFolders(tokens: GoogleDriveTokens) {
    const drive = this.getDriveClient(tokens)
    
    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name, createdTime)',
      pageSize: 100,
      orderBy: 'name',
    })

    return response.data.files || []
  }

  /**
   * Get folder details
   */
  async getFolderDetails(tokens: GoogleDriveTokens, folderId: string) {
    const drive = this.getDriveClient(tokens)
    
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, createdTime, webViewLink',
    })

    return response.data
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleDriveTokens> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const { credentials } = await this.oauth2Client.refreshAccessToken()
    return credentials
  }

  /**
   * Revoke access
   */
  async revokeAccess(tokens: any) {
    this.oauth2Client.setCredentials(tokens)
    await this.oauth2Client.revokeCredentials()
  }

  /**
   * Create a folder for transcripts
   */
  async createTranscriptFolder(tokens: any, parentFolderId?: string) {
    const drive = this.getDriveClient(tokens)
    
    const fileMetadata = {
      name: 'HangJegyzet Átiratok',
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
    })

    return response.data
  }

  /**
   * Upload transcript to Drive
   */
  async uploadTranscript(
    tokens: any,
    transcript: string,
    fileName: string,
    folderId?: string
  ) {
    const drive = this.getDriveClient(tokens)
    
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    }

    const media = {
      mimeType: 'text/plain',
      body: transcript,
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink',
    })

    return response.data
  }

  /**
   * Download file from Google Drive
   */
  async downloadFile(tokens: any, fileId: string): Promise<Buffer> {
    const drive = this.getDriveClient(tokens)
    
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )
    
    return Buffer.from(response.data as ArrayBuffer)
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(tokens: any, fileId: string) {
    const drive = this.getDriveClient(tokens)
    
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink',
    })
    
    return response.data
  }

  /**
   * Check if file is audio or video
   */
  isMediaFile(mimeType: string): boolean {
    return mimeType.startsWith('audio/') || mimeType.startsWith('video/')
  }

  /**
   * Get file details (alias for getFileMetadata for compatibility)
   */
  async getFileDetails(tokens: any, fileId: string) {
    const drive = this.getDriveClient(tokens)
    
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents',
    })
    
    return response.data
  }

  /**
   * Get file as stream for efficient downloading
   */
  async getFileStream(tokens: any, fileId: string) {
    const drive = this.getDriveClient(tokens)
    
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    )
    
    return response.data
  }
}

// Export singleton
export const googleDrive = new GoogleDriveIntegration()