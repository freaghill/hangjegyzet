import { notFound } from 'next/navigation'
import { DocsContent } from '@/components/docs/docs-content'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { DocsSearch } from '@/components/help/docs-search'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

// This would normally come from a CMS or markdown files
const docsContent: Record<string, any> = {
  'getting-started': {
    title: 'Kezdő útmutató',
    lastUpdated: '2024-01-15',
    content: `
# Kezdő útmutató

Üdvözöljük a HangJegyzet.AI dokumentációjában! Ez az útmutató végigvezeti Önt az első lépéseken.

## Regisztráció {#registration}

### 1. Fiók létrehozása

1. Látogasson el a [hangjegyzet.ai](https://hangjegyzet.ai) oldalra
2. Kattintson a "Regisztráció" gombra
3. Adja meg email címét és válasszon biztonságos jelszót
4. Erősítse meg email címét a kapott levélben található linkkel

### 2. Profil beállítása

A sikeres bejelentkezés után állítsa be profilját:

- **Név**: Teljes neve
- **Pozíció**: Munkaköre (opcionális)
- **Profilkép**: Töltsön fel egy képet (opcionális)

## Első meeting {#first-meeting}

### Meeting létrehozása

1. Kattintson az **"Új meeting"** gombra a navigációs sávban
2. Adja meg a meeting címét
3. Válasszon rögzítési módot:
   - **Élő felvétel**: Mikrofonos rögzítés
   - **Fájl feltöltés**: Meglévő hangfájl feldolgozása

### Feldolgozási beállítások

Válasszon a három feldolgozási mód közül:

| Mód | Sebesség | Pontosság | Használat |
|-----|----------|-----------|-----------|
| **Gyors** | 5-10 perc | Alapvető | Gyors jegyzetelés |
| **Kiegyensúlyozott** | 15-20 perc | Magas | Általános használat |
| **Precíziós** | 30+ perc | Maximális | Kritikus dokumentumok |

## Szervezet létrehozása {#organization}

### Új szervezet

1. Navigáljon a **Beállítások → Szervezet** menüponthoz
2. Kattintson az **"Új szervezet létrehozása"** gombra
3. Töltse ki az adatokat:
   - Szervezet neve
   - Iparág
   - Méret (alkalmazottak száma)

### Csapattagok meghívása

1. A szervezet beállításaiban kattintson a **"Tagok"** fülre
2. Kattintson a **"Tag meghívása"** gombra
3. Adja meg a meghívandó személy email címét
4. Válasszon szerepkört:
   - **Tulajdonos**: Teljes hozzáférés
   - **Admin**: Szervezet kezelése
   - **Tag**: Alapvető funkciók

## Következő lépések

Most, hogy beállította fiókját és szervezetét:

- [Meeting rögzítése](/docs/recording) - Ismerje meg a rögzítési opciókat
- [Csapatmunka](/docs/collaboration) - Együttműködés csapattagokkal
- [Integrációk](/docs/integrations) - Kapcsolódjon más eszközökhöz
    `,
  },
  'recording': {
    title: 'Meeting rögzítése',
    lastUpdated: '2024-01-15',
    content: `
# Meeting rögzítése

A HangJegyzet.AI többféle módot kínál meetingek rögzítésére.

## Élő felvétel {#live}

### Mikrofon beállítása

1. Kattintson az **"Új meeting"** gombra
2. Válassza az **"Élő felvétel"** opciót
3. Engedélyezze a mikrofon hozzáférést
4. Válassza ki a kívánt beviteli eszközt

### Felvétel indítása

- Kattintson a piros **Felvétel** gombra
- Beszéljen természetesen és tisztán
- A hangerő jelző mutatja a bemeneti szintet
- Kattintson a **Stop** gombra a befejezéshez

### Tippek a jó minőséghez

- Használjon külső mikrofont ha lehetséges
- Minimalizálja a háttérzajt
- Tartson 15-30 cm távolságot a mikrofontól
- Beszéljen egyenletesen, ne túl gyorsan

## Fájl feltöltés {#upload}

### Támogatott formátumok

| Formátum | Kiterjesztés | Max méret |
|----------|--------------|-----------|
| MP3 | .mp3 | 500 MB |
| WAV | .wav | 500 MB |
| M4A | .m4a | 500 MB |
| OGG | .ogg | 500 MB |
| WebM | .webm | 500 MB |

### Feltöltési folyamat

1. Kattintson az **"Új meeting"** gombra
2. Válassza a **"Fájl feltöltés"** opciót
3. Húzza be a fájlt vagy böngésszen
4. Várja meg a feltöltés befejezését
5. Válasszon feldolgozási módot

### Batch feldolgozás

Egyszerre több fájlt is feltölthet:

1. Jelölje ki az összes fájlt
2. Húzza be őket egyszerre
3. Minden fájl külön meeting lesz
4. A feldolgozás párhuzamosan történik

## Képernyő rögzítés {#screen}

### Beállítás

1. Válassza a **"Képernyő rögzítés"** opciót
2. Engedélyezze a képernyő megosztást
3. Válassza ki mit szeretne rögzíteni:
   - Teljes képernyő
   - Alkalmazás ablak
   - Böngésző lap

### Hang beállítások

- **Mikrofon**: Narráció rögzítése
- **Rendszerhang**: Számítógép hangja
- **Mindkettő**: Kombinált rögzítés

### Használati esetek

- Prezentációk rögzítése
- Demo videók készítése
- Online meetingek archiválása
- Oktatási anyagok létrehozása
    `,
  },
  // Add more documentation pages as needed
}

interface PageProps {
  params: { slug: string }
}

export default function DocPage({ params }: PageProps) {
  const doc = docsContent[params.slug]

  if (!doc) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Vissza a dashboardra
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-semibold">Dokumentáció</h1>
            </div>
            <DocsSearch />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <DocsSidebar currentSlug={params.slug} />
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3">
            <DocsContent content={doc} />
          </main>
        </div>
      </div>
    </div>
  )
}