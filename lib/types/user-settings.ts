export interface UserEmailPreferences {
  meetingCompleted: boolean
  weeklyDigest: boolean
  usageAlerts: boolean
  teamInvites: boolean
  marketingEmails: boolean
}

export interface UserSettings {
  emailPreferences: UserEmailPreferences
  language: 'hu' | 'en'
  timezone: string
  defaultTranscriptionMode: 'fast' | 'balanced' | 'precision'
}

export const defaultUserSettings: UserSettings = {
  emailPreferences: {
    meetingCompleted: true,
    weeklyDigest: true,
    usageAlerts: true,
    teamInvites: true,
    marketingEmails: false,
  },
  language: 'hu',
  timezone: 'Europe/Budapest',
  defaultTranscriptionMode: 'balanced',
}