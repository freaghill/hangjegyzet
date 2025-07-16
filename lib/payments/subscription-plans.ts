// Mode-based allocation for each transcription mode
export interface ModeAllocation {
  fast: number      // Fast mode minutes
  balanced: number  // Balanced mode minutes  
  precision: number // Precision mode minutes
}

// Subscription plan interface
export interface SubscriptionPlanDetails {
  id: string
  name: string
  price: number
  currency: 'HUF' | 'EUR'
  duration: number // days
  limits: {
    minutesPerMonth: number // Total minutes (legacy support)
    modeAllocation: ModeAllocation // New mode-based system
    users: number
    storage: number // days, -1 for unlimited
    maxMeetingDuration: number // minutes
    maxPrecisionPerMeeting: number // minutes
    maxPrecisionPerDay: number // minutes
  }
  features: string[]
  popular?: boolean
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlanDetails> = {
  // Free trial - limited to test the service
  trial: {
    id: 'trial',
    name: 'Próbaidőszak',
    price: 0,
    currency: 'HUF',
    duration: 14, // days
    limits: {
      minutesPerMonth: 120, // Total legacy support
      modeAllocation: {
        fast: 100,
        balanced: 20,
        precision: 0,
      },
      users: 2,
      storage: 30, // days
      maxMeetingDuration: 60,
      maxPrecisionPerMeeting: 0,
      maxPrecisionPerDay: 0,
    },
    features: [
      '100 perc Fast mód',
      '20 perc Balanced mód',
      '2 felhasználó',
      '30 napos tárolás',
      'Email támogatás',
    ],
  },
  
  // Helyi tier - budget-friendly for small businesses
  helyi: {
    id: 'helyi',
    name: 'Helyi',
    price: 7900, // HUF
    currency: 'HUF',
    duration: 30, // days
    limits: {
      minutesPerMonth: 350, // Total for legacy
      modeAllocation: {
        fast: 300,
        balanced: 50,
        precision: 0,
      },
      users: 2,
      storage: 60, // days
      maxMeetingDuration: 90,
      maxPrecisionPerMeeting: 0,
      maxPrecisionPerDay: 0,
    },
    features: [
      '300 perc Fast mód',
      '50 perc Balanced mód',
      '2 felhasználó',
      '60 napos tárolás',
      'Email támogatás',
      'Alapvető export (DOCX, PDF)',
    ],
  },
  
  // Induló tier - for freelancers and small teams
  indulo: {
    id: 'indulo',
    name: 'Induló',
    price: 9990, // HUF
    currency: 'HUF',
    duration: 30, // days
    limits: {
      minutesPerMonth: 600, // Total for legacy
      modeAllocation: {
        fast: 500,
        balanced: 100,
        precision: 0,
      },
      users: 3,
      storage: 90, // days
      maxMeetingDuration: 120,
      maxPrecisionPerMeeting: 0,
      maxPrecisionPerDay: 0,
    },
    features: [
      '500 perc Fast mód',
      '100 perc Balanced mód',
      '3 felhasználó',
      '90 napos tárolás',
      'Email támogatás',
      'Alapvető integrációk',
    ],
  },
  
  // Profi tier - most popular for SMBs
  profi: {
    id: 'profi',
    name: 'Profi',
    price: 29990, // HUF
    currency: 'HUF',
    duration: 30,
    popular: true,
    limits: {
      minutesPerMonth: 2550, // Total for legacy
      modeAllocation: {
        fast: 2000,
        balanced: 500,
        precision: 50,
      },
      users: 10,
      storage: -1, // unlimited
      maxMeetingDuration: 180,
      maxPrecisionPerMeeting: 30,
      maxPrecisionPerDay: 50,
    },
    features: [
      '2000 perc Fast mód',
      '500 perc Balanced mód',
      '50 perc Precision mód',
      '10 felhasználó',
      'Korlátlan tárolás',
      'Prioritás támogatás',
      'Minden integráció',
      'API hozzáférés',
    ],
  },
  
  // Vállalati tier - for large Hungarian companies
  vallalati: {
    id: 'vallalati',
    name: 'Vállalati',
    price: 89990, // HUF
    currency: 'HUF',
    duration: 30,
    limits: {
      minutesPerMonth: 12200, // Total for legacy
      modeAllocation: {
        fast: 10000,
        balanced: 2000,
        precision: 200,
      },
      users: 50,
      storage: -1, // unlimited
      maxMeetingDuration: 180,
      maxPrecisionPerMeeting: 60,
      maxPrecisionPerDay: 100,
    },
    features: [
      '10,000 perc Fast mód',
      '2,000 perc Balanced mód',
      '200 perc Precision mód',
      '50 felhasználó',
      'Korlátlan tárolás',
      'Egyedi szótár',
      'Dedikált támogatás',
      'SLA garancia',
      'Csapat tréning',
    ],
  },
  
  // Multinational tier - for international companies
  multinational: {
    id: 'multinational',
    name: 'Multinational',
    price: 599, // EUR
    currency: 'EUR',
    duration: 30,
    limits: {
      minutesPerMonth: -1, // Unlimited total
      modeAllocation: {
        fast: -1, // Unlimited
        balanced: 10000,
        precision: 1000,
      },
      users: -1, // unlimited
      storage: -1, // unlimited
      maxMeetingDuration: 240,
      maxPrecisionPerMeeting: 120,
      maxPrecisionPerDay: 200,
    },
    features: [
      'Korlátlan Fast mód',
      '10,000 perc Balanced mód',
      '1,000 perc Precision mód',
      'Korlátlan felhasználó',
      'Multi-language support',
      'SSO integráció',
      'API (magas limit)',
      'Dedikált infrastruktúra',
      '99.9% SLA',
      '24/7 English support',
      'Egyedi AI képzés',
    ],
  },
  
  // EUR pricing plans for pricing page
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 49, // EUR
    currency: 'EUR',
    duration: 30,
    limits: {
      minutesPerMonth: 600,
      modeAllocation: {
        fast: 500,
        balanced: 100,
        precision: 0,
      },
      users: 3,
      storage: 90,
      maxMeetingDuration: 120,
      maxPrecisionPerMeeting: 0,
      maxPrecisionPerDay: 0,
    },
    features: [
      '500 perc Fast mód',
      '100 perc Balanced mód',
      '3 felhasználó',
      'AI összefoglaló',
      'Teendők kinyerése',
      'Export (PDF, Word)',
      'Google Drive integráció',
      'Email támogatás',
    ],
  },
  
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 99, // EUR
    currency: 'EUR',
    duration: 30,
    popular: true,
    limits: {
      minutesPerMonth: 2550,
      modeAllocation: {
        fast: 2000,
        balanced: 500,
        precision: 50,
      },
      users: 10,
      storage: -1,
      maxMeetingDuration: 180,
      maxPrecisionPerMeeting: 30,
      maxPrecisionPerDay: 50,
    },
    features: [
      '✅ 2000 perc Fast mód',
      '✅ 500 perc Balanced mód',
      '✅ 50 perc Precision mód',
      '10 felhasználó',
      'Sentiment analysis',
      'Meeting analytics',
      'Zoom & Teams integráció',
      'API hozzáférés (1000/hó)',
      'Prioritás támogatás',
    ],
  },
  
  business: {
    id: 'business',
    name: 'Business',
    price: 299, // EUR
    currency: 'EUR',
    duration: 30,
    limits: {
      minutesPerMonth: 12200,
      modeAllocation: {
        fast: 10000,
        balanced: 2000,
        precision: 200,
      },
      users: 50,
      storage: -1,
      maxMeetingDuration: 180,
      maxPrecisionPerMeeting: 60,
      maxPrecisionPerDay: 100,
    },
    features: [
      '✅ 10,000 perc Fast mód',
      '✅ 2,000 perc Balanced mód',
      '✅ 200 perc Precision mód',
      '50 felhasználó',
      'Többnyelvű támogatás',
      'Egyéni AI modellek',
      'SSO integráció',
      'Korlátlan API',
      'SLA garancia 99.9%',
      'Dedikált support',
    ],
  },
  
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0, // Custom pricing
    currency: 'EUR',
    duration: 30,
    limits: {
      minutesPerMonth: -1,
      modeAllocation: {
        fast: -1,
        balanced: -1,
        precision: -1,
      },
      users: -1,
      storage: -1,
      maxMeetingDuration: 240,
      maxPrecisionPerMeeting: -1,
      maxPrecisionPerDay: -1,
    },
    features: [
      '✅ Korlátlan minden mód',
      '✅ Korlátlan felhasználó',
      '✅ Dedikált infrastruktúra',
      'Executive insights',
      'On-premise telepítés',
      'HIPAA compliance',
      'Egyéni integrációk',
      '99.99% SLA',
      '24/7 támogatás',
      'Egyedi AI képzés',
    ],
  },
}

// Legacy support - map old plan names
export const LEGACY_PLAN_MAPPING: Record<string, string> = {
  'starter': 'indulo',
  'professional': 'profi',
  'enterprise': 'vallalati',
}

// Helper to get plan by ID (supports legacy IDs)
export function getSubscriptionPlan(planId: string): SubscriptionPlanDetails | undefined {
  // Check direct match first
  if (SUBSCRIPTION_PLANS[planId]) {
    return SUBSCRIPTION_PLANS[planId]
  }
  
  // Check legacy mapping
  const mappedId = LEGACY_PLAN_MAPPING[planId]
  if (mappedId && SUBSCRIPTION_PLANS[mappedId]) {
    return SUBSCRIPTION_PLANS[mappedId]
  }
  
  return undefined
}

// Helper to check if user has access to a specific mode
export function canUseMode(
  plan: SubscriptionPlanDetails,
  mode: 'fast' | 'balanced' | 'precision',
  currentUsage: ModeAllocation
): { allowed: boolean; remaining: number; limit: number } {
  const limit = plan.limits.modeAllocation[mode]
  const used = currentUsage[mode] || 0
  
  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1, limit: -1 }
  }
  
  const remaining = Math.max(0, limit - used)
  return {
    allowed: remaining > 0,
    remaining,
    limit,
  }
}

// Helper to calculate price per minute for each mode
export function getModePricing(mode: 'fast' | 'balanced' | 'precision'): number {
  // Prices in HUF per minute
  const prices = {
    fast: 20,      // ~$0.05
    balanced: 40,  // ~$0.10  
    precision: 120 // ~$0.30
  }
  return prices[mode]
}

// Credit system for future implementation
export interface CreditPack {
  id: string
  name: string
  credits: number
  price: number
  currency: 'HUF' | 'EUR'
  popular?: boolean
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Kezdő csomag',
    credits: 100,
    price: 2990,
    currency: 'HUF',
  },
  {
    id: 'pro',
    name: 'Pro csomag',
    credits: 500,
    price: 12990,
    currency: 'HUF',
    popular: true,
  },
  {
    id: 'business',
    name: 'Üzleti csomag',
    credits: 2000,
    price: 39990,
    currency: 'HUF',
  },
]

// Credit to minute conversion rates
export const CREDIT_CONVERSION = {
  fast: 1,      // 1 credit = 1 fast minute
  balanced: 2,  // 2 credits = 1 balanced minute
  precision: 5, // 5 credits = 1 precision minute
}

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS

// Utility functions
export function formatPrice(price: number, currency: 'HUF' | 'EUR' = 'HUF'): string {
  return new Intl.NumberFormat(currency === 'HUF' ? 'hu-HU' : 'en-EU', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function calculateYearlyPrice(monthlyPrice: number, discountPercent: number = 20): number {
  const yearlyTotal = monthlyPrice * 12
  const discount = yearlyTotal * (discountPercent / 100)
  return Math.round(yearlyTotal - discount)
}