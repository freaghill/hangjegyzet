import { notFound } from 'next/navigation'
import { DocsContent } from '@/components/docs/docs-content'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { DocsSearch } from '@/components/help/docs-search'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const zoomIntegrationDoc = {
  title: 'Zoom integráció',
  lastUpdated: '2024-01-15',
  content: `
# Zoom integráció

A HangJegyzet Zoom integrációja lehetővé teszi, hogy automatikusan importálja és feldolgozza Zoom meeting felvételeit.

## Főbb funkciók

### 🔄 Automatikus szinkronizálás
- Zoom Cloud felvételek automatikus importálása
- Valós idejű értesítések új felvételekről
- Háttérben futó feldolgozás

### 📊 Teljes integráció
- Meeting metaadatok importálása
- Résztvevő lista szinkronizálása
- Chat üzenetek importálása
- Meeting jegyzetek átvétele

## Beállítási útmutató

### 1. lépés: Zoom App hozzáadása

1. Lépjen be a [Zoom Marketplace](https://marketplace.zoom.us) oldalra
2. Keresse meg a "HangJegyzet" alkalmazást
3. Kattintson a "Telepítés" gombra
4. Engedélyezze a szükséges jogosultságokat

### 2. lépés: Csatlakoztatás a HangJegyzethez

1. Nyissa meg a HangJegyzet beállításokat
2. Válassza az "Integrációk" menüpontot
3. Kattintson a Zoom "Csatlakoztatás" gombjára
4. Jelentkezzen be Zoom fiókjával
5. Engedélyezze a hozzáférést

### 3. lépés: Beállítások konfigurálása

#### Automatikus importálás
- **Minden felvétel**: Összes Zoom felvétel automatikus importálása
- **Csak megjelölt**: Csak a kiválasztott meetingek importálása
- **Manuális**: Egyenként választható felvételek

#### Feldolgozási beállítások
- Alapértelmezett átírási mód kiválasztása
- Automatikus értesítések beállítása
- Megosztási szabályok definiálása

## Használat

### Automatikus importálás
Ha bekapcsolta az automatikus importálást:
1. Tartson egy Zoom meetinget
2. Fejezze be és mentse a felvételt
3. A HangJegyzet automatikusan importálja
4. Értesítést kap a feldolgozás végén

### Manuális importálás
1. Lépjen a "Meetingek" oldalra
2. Kattintson az "Importálás Zoom-ból" gombra
3. Válassza ki a kívánt felvételeket
4. Indítsa el a feldolgozást

## Speciális funkciók

### Meeting típus felismerés
A rendszer automatikusan felismeri:
- Webinárok
- Ismétlődő meetingek
- Breakout room felvételek
- Képernyőmegosztások

### Résztvevő összekapcsolás
- Zoom résztvevők automatikus összekapcsolása HangJegyzet felhasználókkal
- Email alapú egyeztetés
- Manuális hozzárendelés lehetősége

## Biztonsági információk

### Adatkezelés
- A felvételek titkosított csatornán kerülnek átvitelre
- Zoom felvételek nem kerülnek tárolásra a feldolgozás után
- Csak a szükséges metaadatok kerülnek mentésre

### Jogosultságok
Szükséges Zoom jogosultságok:
- **recording:read** - Felvételek olvasása
- **meeting:read** - Meeting adatok olvasása
- **user:read** - Felhasználói adatok olvasása

## Hibaelhárítás

### Nem jelennek meg a felvételek
1. Ellenőrizze a Zoom jogosultságokat
2. Győződjön meg róla, hogy a felvételek a Cloud-ban vannak
3. Ellenőrizze az integráció állapotát

### Sikertelen importálás
- Ellenőrizze a felvétel formátumát
- Győződjön meg a megfelelő tárhely kvótáról
- Próbálja meg újra később

### Kapcsolat megszakadt
1. Lépjen az Integrációk beállításokhoz
2. Kattintson az "Újracsatlakozás" gombra
3. Engedélyezze újra a hozzáférést

## GYIK

**K: Mennyi ideig tart egy Zoom felvétel importálása?**

V: A felvétel hosszától függően 2-10 perc.

**K: Milyen Zoom csomagok támogatottak?**

V: Pro, Business, Enterprise és Education csomagok.

**K: Törölhetem a Zoom felvételt importálás után?**

V: Igen, a HangJegyzet független másolatot készít.

**K: Működik webinárokkal is?**

V: Igen, a webinár felvételek ugyanúgy importálhatók.

## Támogatás

Ha további kérdése van a Zoom integrációval kapcsolatban:
- 📧 Email: support@hangjegyzet.hu
- 💬 Chat: Jobb alsó sarok
- 📚 [További dokumentáció](/docs)
  `
}

export default function ZoomIntegrationPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/docs"
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Vissza a dokumentációhoz
              </Link>
              <span className="text-gray-400">|</span>
              <h1 className="text-xl font-semibold">Integrációk</h1>
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
            <DocsSidebar currentSlug="integrations/zoom" />
          </aside>

          {/* Main content */}
          <main className="lg:col-span-3">
            <DocsContent content={zoomIntegrationDoc} />
          </main>
        </div>
      </div>
    </div>
  )
}