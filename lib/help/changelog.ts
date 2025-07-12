interface ChangelogEntry {
  version: string
  date: string
  type: 'major' | 'minor' | 'patch'
  changes: {
    category: 'new' | 'improved' | 'fixed' | 'security'
    items: string[]
  }[]
}

export const changelog: ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: '2024-01-15',
    type: 'minor',
    changes: [
      {
        category: 'new',
        items: [
          'Hozzáadtuk az elemzések dashboardot részletes statisztikákkal',
          'Új együttműködési funkciók: megjegyzések és feladat kezelés',
          'Webhook integrációk automatizáláshoz (Zapier-szerű)',
          'Egyéni export sablonok Handlebars támogatással',
        ],
      },
      {
        category: 'improved',
        items: [
          'BullMQ alapú job queue a jobb teljesítményért',
          'Megnövelt adatbázis kapcsolat pool (50 kapcsolat)',
          'Redis Sentinel támogatás a magas rendelkezésre állásért',
          'HTTP/2 és tömörítés engedélyezve',
        ],
      },
      {
        category: 'fixed',
        items: [
          'Javítva a fájl feltöltési időtúllépés hiba',
          'Megoldva a transzkripció megszakadása nagy fájloknál',
          'Kijavítva a időzóna probléma az export funkcióban',
        ],
      },
    ],
  },
  {
    version: '1.4.2',
    date: '2024-01-08',
    type: 'patch',
    changes: [
      {
        category: 'improved',
        items: [
          'Gyorsabb meeting lista betöltés',
          'Jobb hibaüzenetek a felhasználóknak',
          'Optimalizált képernyő rögzítés',
        ],
      },
      {
        category: 'fixed',
        items: [
          'Email értesítések kézbesítési problémája megoldva',
          'Safari böngésző kompatibilitási javítások',
        ],
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2024-01-01',
    type: 'minor',
    changes: [
      {
        category: 'new',
        items: [
          'Admin dashboard ügyfélszolgálati funkciókkal',
          'Sentry error tracking integráció',
          'Prometheus metrikák monitoringhoz',
          'Részletes health check végpontok',
        ],
      },
      {
        category: 'security',
        items: [
          'Frissített függőségek a legújabb biztonsági javításokkal',
          'Megerősített CORS szabályok',
          'Rate limiting minden API végponton',
        ],
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2023-12-15',
    type: 'minor',
    changes: [
      {
        category: 'new',
        items: [
          'Valós idejű együttműködés WebSocket támogatással',
          'Új feldolgozási mód: Precíziós (maximális pontosság)',
          'Batch fájl feltöltés több meeting egyidejű feldolgozásához',
          'Képernyő rögzítés funkció prezentációkhoz',
        ],
      },
      {
        category: 'improved',
        items: [
          'Jelentősen javított transzkripció pontosság magyar nyelven',
          'Gyorsabb AI összefoglaló generálás',
          'Átdolgozott felhasználói felület jobb használhatósággal',
          'Mobil reszponzív design fejlesztések',
        ],
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2023-11-20',
    type: 'minor',
    changes: [
      {
        category: 'new',
        items: [
          'Microsoft Teams integráció',
          'Google Calendar szinkronizálás',
          'Automatikus hang javítás és zajszűrés',
          'Többnyelvű támogatás (angol, német mellett)',
        ],
      },
      {
        category: 'improved',
        items: [
          'Gyorsabb fájl feltöltés nagy méretű hangfájlokhoz',
          'Jobb keresési funkciók a meeting listában',
          'Részletesebb export opciók Word dokumentumokhoz',
        ],
      },
      {
        category: 'fixed',
        items: [
          'Időzóna kezelési problémák javítva',
          'Memória szivárgás megoldva hosszú felvételeknél',
        ],
      },
    ],
  },
]