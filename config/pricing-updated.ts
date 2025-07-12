export const PRICING_PLANS = {
  helyi: {
    id: 'helyi',
    name: 'Helyi',
    description: 'Kisvállalkozásoknak',
    price: 7900,
    currency: 'HUF',
    interval: 'month',
    features: [
      '300 perc gyors átírás',
      '50 perc kiegyensúlyozott átírás',
      'Alapvető AI összefoglaló',
      'Export (DOCX, PDF)',
      'Email támogatás'
    ],
    limits: {
      fast: 300,
      balanced: 50,
      precision: 0
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_HELYI,
    recommended: false
  },
  indulo: {
    id: 'indulo',
    name: 'Induló',
    description: 'Növekvő csapatoknak',
    price: 9900, // Was 10,000
    currency: 'HUF',
    interval: 'month',
    features: [
      '500 perc gyors átírás',
      '100 perc kiegyensúlyozott átírás',
      'Fejlett AI elemzés',
      'Integrációk (Google Drive, Zoom)',
      'Valós idejű átírás',
      'Prioritás támogatás'
    ],
    limits: {
      fast: 500,
      balanced: 100,
      precision: 0
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_INDULO,
    recommended: true
  },
  profi: {
    id: 'profi',
    name: 'Profi',
    description: 'Szakmai felhasználóknak',
    price: 29900, // Keep at 30,000 Ft
    currency: 'HUF',
    interval: 'month',
    features: [
      '2000 perc gyors átírás',
      '500 perc kiegyensúlyozott átírás',
      '50 perc precíziós átírás',
      'Minden integráció',
      'API hozzáférés',
      'Egyedi jelentések',
      'Telefonos támogatás'
    ],
    limits: {
      fast: 2000,
      balanced: 500,
      precision: 50
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PROFI,
    recommended: false
  },
  vallalati: {
    id: 'vallalati',
    name: 'Vállalati',
    description: 'Nagyvállalatoknak',
    price: 89900, // Was 90,000
    currency: 'HUF',
    interval: 'month',
    features: [
      '10000 perc gyors átírás',
      '2000 perc kiegyensúlyozott átírás',
      '200 perc precíziós átírás',
      'Dedikált fiók menedzser',
      'SLA garancia',
      'Egyedi fejlesztések',
      'On-premise opció'
    ],
    limits: {
      fast: 10000,
      balanced: 2000,
      precision: 200
    },
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_VALLALATI,
    recommended: false
  }
}

// Outcome-based bundles for specific segments
export const SEGMENT_BUNDLES = {
  lawyer: {
    name: 'Ügyvédi Csomag',
    basePlan: 'profi',
    additionalFeatures: [
      'Jogi szakkifejezések szótára',
      'Automatikus ügyirat számozás',
      'Titkosított tárolás',
      'Ügyfél portál'
    ],
    price: 39900 // Premium for specialized features
  },
  healthcare: {
    name: 'Egészségügyi Csomag',
    basePlan: 'profi',
    additionalFeatures: [
      'GDPR megfelelőség',
      'Beteg beleegyezés kezelés',
      'Orvosi terminológia',
      'EESZT integráció'
    ],
    price: 44900
  },
  consultant: {
    name: 'Tanácsadói Csomag',
    basePlan: 'indulo',
    additionalFeatures: [
      'Projekt alapú rendszerezés',
      'Ügyfél megosztás',
      'Időkövetés',
      'Számlázási integráció'
    ],
    price: 19900
  }
}