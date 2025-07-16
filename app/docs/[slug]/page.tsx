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
  'transcription-modes': {
    title: 'Átírási módok',
    lastUpdated: '2024-01-15',
    content: `
# Átírási módok

A HangJegyzet három különböző átírási módot kínál, mindegyik más igényekre optimalizálva.

## Módok összehasonlítása

| Jellemző | ⚡ Gyors | ⚖️ Kiegyensúlyozott | 🎯 Precíziós |
|----------|---------|-------------------|-------------|
| **Pontosság** | 90-93% | 94-96% | 97%+ |
| **Sebesség** | Valós idő | 2-3 perc | 5-8 perc |
| **Ár/perc** | 20 Ft | 40 Ft | 120 Ft |
| **Ideális** | Gyors jegyzetelés | Általános használat | Kritikus dokumentumok |

## ⚡ Gyors mód

### Jellemzők
- **Sebesség**: Szinte azonnali eredmények
- **Pontosság**: 90-93% tisztán érthető beszédnél
- **Költség**: Leggazdaságosabb opció

### Ideális használati esetek
- Napi standup meetingek
- Informális megbeszélések
- Gyors ellenőrzés
- Saját jegyzetek készítése

### Technikai részletek
- Egyszeri átfutás
- Alapvető zaj szűrés
- Standard nyelvi modell

## ⚖️ Kiegyensúlyozott mód

### Jellemzők
- **Sebesség**: 2-3 percen belül
- **Pontosság**: 94-96% általános beszédnél
- **Költség**: Optimális ár-érték arány

### Ideális használati esetek
- Üzleti meetingek
- Ügyféltalálkozók
- Projekt megbeszélések
- Oktatási anyagok

### Technikai részletek
- Kétszeri átfutás
- Fejlett zajszűrés
- Kontextus alapú javítások
- Szókészlet optimalizálás

## 🎯 Precíziós mód

### Jellemzők
- **Sebesség**: 5-8 perc feldolgozás
- **Pontosság**: 97%+ profi körülmények között
- **Költség**: Prémium árazás

### Ideális használati esetek
- Jogi megbeszélések
- Orvosi konzultációk
- Igaz- gatsági ülések
- Hivatalos jegyzőkönyvek

### Technikai részletek
- Többszöri átfutás
- AI utófeldolgozás
- Szaknyelvi optimalizálás
- Keresztellenőrzés

## Választási útmutató

### Válassza a Gyors módot, ha:
- Gyorsan szüksége van az eredményre
- A tartalmat saját használatra készíti
- Az ár a legfontosabb szempont

### Válassza a Kiegyensúlyozott módot, ha:
- Üzleti célokra használja
- Megosztásra szánja a jegyzeteket
- Jó minőséget vár elfogadható áron

### Válassza a Precíziós módot, ha:
- Kritikus a pontosság
- Hivatalos dokumentáció készül
- Szaknyelvi tartalomról van szó
    `
  },
  'ai-summaries': {
    title: 'AI összefoglalók',
    lastUpdated: '2024-01-15',
    content: `
# AI összefoglalók

A HangJegyzet fejlett AI technológiát használ az átírt meetingek intelligens összefoglalására.

## Működési folyamat

### 1. Szöveg elemzése
Az AI először elemzi a teljes átiratot:
- Témák azonosítása
- Kulcsszavak kinyerése
- Beszélők hozzájárulásainak súlyozása

### 2. Strukturálás
Az AI logikai egységekre bontja a tartalmat:
- Bevezetés és kontextus
- Fő témapontok
- Döntések és akciók
- Következtések

### 3. Összefoglaló generálás
Többféle összefoglaló típus készül:

## Összefoglaló típusok

### 📋 Vezetői összefoglaló
**Terjedelme**: 3-5 mondat

- Legfontosabb döntések
- Kritikus akciópontok
- Eredmények és határidők

### 📄 Részletes összefoglaló
**Terjedelme**: 1-2 oldal

- Minden fontos téma
- Beszélőnkénti hozzájárulások
- Döntési folyamat
- Részletes akcióterv

### ✅ Akció-orientált összefoglaló
**Fókusz**: Teendők és felelősök

- Feladatlista táblázat
- Felelősök megnevezése
- Határidők
- Prioritások

## AI képességek

### Automatikus felismerés
- **Döntések**: "Eldöntöttük", "Megegyeztünk", "Jóváhagytuk"
- **Akciók**: "Meg kell csinálni", "Felelős:", "Határidő:"
- **Problémák**: "Aggódás", "Kockázat", "Blokkoló"
- **Következő lépések**: "Következő meeting", "Ellenőrizni kell"

### Kontextus megértés
- Korábbi meetingekre hivatkozás
- Projekt státusz követés
- Ismétlődő témák azonosítása

## Testreszabási lehetőségek

### Sablonok
Választhat előre definiált sablonok közül:
- Igazgatósági ülés
- Projekt státusz
- Ügyféltalálkozó
- Csapat megbeszélés
- Oktatás/tréning

### Egyéni beállítások
- Preferrednyelv és stílus
- Részletesség mértéke
- Kiemelendő témák
- Kizárandó elemek

## Minőségbiztosítás

### Pontosság
- Az AI nem talál ki információt
- Csak az elhangzottakat foglalja össze
- Bizonytalanság esetén jelez

### Ellenőrzés
- Hivatkozások az eredeti szövegre
- Időbélyegek a fontos részeknél
- Szerkeszthető összefoglalók

## GYIK

**K: Mennyi idő alatt készül el az összefoglaló?**

V: Az összefoglaló az átírás után azonnal elérhető.

**K: Lehet-e szerkeszteni az összefoglalót?**

V: Igen, minden összefoglaló szerkeszthető és testreszabható.

**K: Milyen nyelven készülnek az összefoglalók?**

V: Magyar és angol nyelven, a meeting nyelvétől függően.
    `
  },
  'speaker-identification': {
    title: 'Beszélő azonosítás',
    lastUpdated: '2024-01-15',
    content: `
# Beszélő azonosítás

A HangJegyzet fejlett technológiát használ a különböző beszélők automatikus azonosítására.

## Működési elv

### Hangalaprtú azonosítás
A rendszer elemzi a hangjellemzőket:
- Hangmagasság
- Beszédtempjson
- Hangszsonín
- Beszjsonédsáját

### Gépi tanulás
Az AI folyamatosan tanul:
- Minden meeting javítja a pontosságot
- Adaptálódik a hangváltozásokhoz
- Felismeri az ismétlődő résztvevőket

## Azonosítási módok

### 🤖 Automatikus mód
**Alapbeállítás új meetingekhez**

- Beszélők számának automatikus felismerése
- "Beszélő 1", "Beszélő 2" címkék
- Utólag átnevezhető

### 👥 Névvel ellátott mód
**Előzetes beállítással**

- Résztvevők megadása előre
- Automatikus hozzárendelés
- Nagyobb pontosság

### 🎤 Hangprofil mód
**Visszatérő résztvevőkhöz**

- Mentett hangprofilok
- 95%+ azonosítási pontosság
- Automatikus felismerés

## Pontossági tényezők

### Javító tényezők
✅ Tiszta hangminőség
✅ Külön mikrofonok
✅ Kevés háttérzaj
✅ Egyenletes hangervelő

### Nehézséget okozó tényezők
❌ Egymásba beszélés
❌ Rossz hangminőség
❌ Hasonló hangok
❌ Háttérzaj

## Beállítási lehetőségek

### Meeting előtt
1. Résztvevők megadása
2. Hangprofilok kiválasztása
3. Ültetési rend megadása (opcionális)

### Meeting alatt
- Valós idejű ellenőrzés
- Azonnali javítás lehetősége
- Átmeneti felcserélések kezelése

### Meeting után
- Teljes ellenőrzés és javítás
- Hangprofilok finomhangolása
- Javítások mentése jövőbeli meetingekhez

## Adatvédelem

### Biztonság
🔒 Hangprofilok titkosítva tárolva
🔒 Csak az adott szervezeten belül elérhetők
🔒 Bármikor törölhetők

### GDPR megfelelőség
- Explicit hozzájárulás szükséges
- Adatok exportálhatók
- Törlési jog biztosított

## Tippek a jobb eredményhez

### Előkészületek
1. Minőségi mikrofon használata
2. Csendes környezet biztosítása
3. Résztvevők előzetes regisztrálása

### Meeting alatt
1. Egyszerre egy ember beszéljen
2. Tisztán, érthetően fogalmazzanak
3. Kerüljék az egymásba beszélést

## GYIK

**K: Mennyi ideig tart a hangprofilok létrehozása?**

V: Az első meeting során automatikusan létrejön, további beállítás nem szükséges.

**K: Hány beszélőt tud megkülönböztetni?**

V: Elméletileg korlátlan, de 10-15 fő felett csökkenhet a pontosság.

**K: Mi történik, ha valaki betegeség miatt másképp beszél?**

V: A rendszer adaptbloodivk a kisebb változásokhoz, szükség esetén manuálisan javítható.
    `
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