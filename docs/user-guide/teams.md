# Csapatmunka és együttműködés

A Hangjegyzet csapatmunka funkciói lehetővé teszik a hatékony együttműködést és információmegosztást a szervezeten belül.

## 👥 Csapatok létrehozása

### Videó bemutató
[![Csapatmunka bemutató](./screenshots/video-thumbnail-teams.png)](https://hangjegyzet.hu/videos/team-collaboration)
*Kattintson a teljes bemutató megtekintéséhez*

### Első csapat létrehozása

![Csapat létrehozás](./screenshots/create-team.png)

1. Kattintson a **"+ Új csapat"** gombra
2. Töltse ki a csapat adatait:
   - **Csapat neve**: pl. "Marketing Team"
   - **Leírás**: Rövid ismertető
   - **Csapat típusa**:
     - 🏢 Részleg
     - 📋 Projekt
     - 🤝 Ügyfél
     - 🎯 Egyéb

3. Kattintson a **"Csapat létrehozása"** gombra

### Csapat beállítások

![Csapat beállítások](./screenshots/team-settings.png)

**Alapbeállítások:**
- 🖼️ Csapat logó feltöltése
- 🎨 Szín választása
- 📧 Email értesítések
- 🔔 Alapértelmezett jogosultságok
- 🌐 Nyelvi preferenciák

## 🎭 Szerepkörök és jogosultságok

### Szerepkör hierarchia

![Szerepkör hierarchia](./screenshots/role-hierarchy.png)

| Szerepkör | Jogosultságok | Ikon |
|-----------|---------------|------|
| **Tulajdonos** | Teljes kontroll, csapat törlése | 👑 |
| **Admin** | Tagok kezelése, beállítások | 🛡️ |
| **Tag** | Tartalom létrehozása, szerkesztése | ✏️ |
| **Néző** | Csak megtekintés, kommentelés | 👁️ |

### Jogosultságok részletesen

![Jogosultság mátrix](./screenshots/permission-matrix.png)

**Tulajdonos (👑) képes:**
- ✅ Csapat törlése
- ✅ Tulajdonos váltás
- ✅ Minden admin jogosultság

**Admin (🛡️) képes:**
- ✅ Tagok meghívása/eltávolítása
- ✅ Szerepkörök módosítása
- ✅ Csapat beállítások
- ✅ Minden tag jogosultság

**Tag (✏️) képes:**
- ✅ Találkozók feltöltése
- ✅ Átírások szerkesztése
- ✅ Megosztás csapaton belül
- ✅ Megjegyzések, címkézés

**Néző (👁️) képes:**
- ✅ Találkozók megtekintése
- ✅ Letöltés (ha engedélyezett)
- ✅ Megjegyzések írása
- ❌ Szerkesztés

### Egyedi szerepkörök

![Egyedi szerepkörök](./screenshots/custom-roles.png)

Enterprise csomag funkció:
1. **Szerepkör létrehozása**
2. **Jogosultságok kiválasztása**
3. **Tagok hozzárendelése**
4. **Mentés és alkalmazás**

## 📨 Tagok meghívása

### Email meghívó

![Email meghívó](./screenshots/email-invitation.png)

1. Kattintson a **"+ Tag hozzáadása"** gombra
2. Adja meg az email címeket (vesszővel elválasztva)
3. Válassza ki a szerepkört
4. Személyes üzenet (opcionális)
5. Kattintson a **"Meghívók küldése"** gombra

### Meghívó link

![Meghívó link](./screenshots/invitation-link.png)

1. Kattintson a **"Link generálása"** opcióra
2. Állítsa be:
   - Alapértelmezett szerepkör
   - Lejárati idő
   - Használati limit
3. Másolja és ossza meg a linket

### Tömeges import

![Tömeges import](./screenshots/bulk-import.png)

CSV fájlból történő import:
```csv
email,name,role
john@company.com,John Doe,member
jane@company.com,Jane Smith,admin
```

## 🗂️ Csapat munkaterület

### Megosztott dashboard

![Csapat dashboard](./screenshots/team-dashboard.png)

**Megjelenített információk:**
- 📊 Csapat statisztikák
- 📅 Legutóbbi találkozók
- 👥 Aktív tagok
- 📈 Aktivitás trend
- 🎯 Csapat célok

### Közös találkozók

![Közös találkozók](./screenshots/shared-meetings.png)

**Szűrési lehetőségek:**
- 👤 Tulajdonos szerint
- 📅 Dátum szerint
- 🏷️ Címke szerint
- ⭐ Kedvencek
- 🔍 Keresés

### Csapat könyvtár

![Csapat könyvtár](./screenshots/team-library.png)

Közös tudásbázis:
- 📁 Mappa struktúra
- 🏷️ Egységes címkézés
- 📌 Rögzített elemek
- 🔗 Gyorslinkek
- 📚 Sablonok

## 💬 Kommunikáció és együttműködés

### Valós idejű együttműködés

![Valós idejű együttműködés](./screenshots/real-time-collaboration.png)

**Funkciók:**
- 👥 Ki nézi éppen
- ✏️ Egyidejű szerkesztés
- 💭 Élő chat
- 🔔 Azonnali értesítések
- 📍 Kurzor követés

### Megjegyzések és vita

![Megjegyzés rendszer](./screenshots/comment-system.png)

**Megjegyzés típusok:**
- 💬 Általános megjegyzés
- ❓ Kérdés
- ✅ Jóváhagyás kérés
- 🚨 Probléma jelzés
- 💡 Javaslat

### @Említések

![Említés rendszer](./screenshots/mention-system.png)

Használat:
1. Írjon **@** karaktert
2. Kezdje el gépelni a nevet
3. Válasszon a listából
4. Az illető értesítést kap

## 📊 Csapat analitika

### Aktivitás áttekintő

![Csapat aktivitás](./screenshots/team-activity.png)

**Követett metrikák:**
- 📈 Feltöltött találkozók száma
- ⏱️ Átírási percek
- 👥 Aktív tagok
- 💬 Megjegyzések száma
- 🎯 Teljesített célok

### Tag teljesítmény

![Tag teljesítmény](./screenshots/member-performance.png)

Egyéni statisztikák:
- Aktivitás szint
- Hozzájárulás mértéke
- Válaszidők
- Minőségi mutatók
- Együttműködési index

### Használati jelentések

![Használati jelentések](./screenshots/usage-reports.png)

**Jelentés típusok:**
- Heti összefoglaló
- Havi analitika
- Projekt jelentés
- ROI kalkuláció
- Trend elemzés

## 🔒 Csapat biztonság

### Hozzáférés kezelés

![Hozzáférés kezelés](./screenshots/access-management.png)

**Biztonsági funkciók:**
- 🔐 Kétfaktoros hitelesítés
- 📱 Eszköz korlátozás
- 🌍 IP korlátozás
- ⏰ Időalapú hozzáférés
- 📋 Audit napló

### Adatvédelem

![Adatvédelmi beállítások](./screenshots/data-protection.png)

**Védelem szintek:**
- Nyilvános (csapaton belül)
- Korlátozott (kiválasztott tagok)
- Bizalmas (csak adminok)
- Szigorúan bizalmas (titkosított)

### Megfelelőség

![Megfelelőségi dashboard](./screenshots/compliance-dashboard.png)

**Támogatott szabványok:**
- ✅ GDPR
- ✅ ISO 27001
- ✅ SOC 2
- ✅ HIPAA (Enterprise)
- ✅ Egyedi szabályozások

## 🔄 Integrációk csapat szinten

### Kommunikációs eszközök

![Kommunikációs integrációk](./screenshots/communication-integrations.png)

**Támogatott platformok:**
- 💬 Slack
- 👥 Microsoft Teams
- 📧 Email értesítések
- 💼 Discord
- 🔔 Webhook-ok

### Projekt menedzsment

![Projekt integrációk](./screenshots/project-integrations.png)

Szinkronizálás:
- 📋 Asana
- 🎯 Trello
- 📊 Monday.com
- 🚀 Jira
- 📝 Notion

### Dokumentum kezelés

![Dokumentum integrációk](./screenshots/document-integrations.png)

Automatikus mentés:
- 📁 Google Drive
- 📎 Dropbox
- 🏢 OneDrive
- 📄 SharePoint
- 🗄️ Box

## 🎯 Csapat munkamenet

### Meeting előkészítés

![Meeting előkészítés](./screenshots/meeting-preparation.png)

**Csapat meeting sablon:**
1. Napirend megosztása
2. Előzetes anyagok
3. Szerepek kiosztása
4. Célok meghatározása
5. Sikerkritériumok

### Meeting alatt

![Meeting közben](./screenshots/during-meeting.png)

**Csapat funkciók:**
- 🎙️ Szerepkör alapú felvétel
- 📝 Közös jegyzetelés
- ✋ Felszólalási sorrend
- ⏱️ Időmérés szerepkörönként
- 📊 Élő szavazás

### Meeting után

![Meeting követés](./screenshots/meeting-followup.png)

**Automatikus műveletek:**
- 📧 Összefoglaló küldése
- 📋 Feladatok kiosztása
- 📅 Következő meeting
- 📊 Teljesítmény értékelés
- 🎯 Cél követés

## 🏆 Legjobb gyakorlatok

### Csapat felállítás

1. **Tiszta struktúra**
   - Egyértelmű szerepkörök
   - Dokumentált folyamatok
   - Rendszeres felülvizsgálat

2. **Kommunikáció**
   - Heti csapat meeting
   - Tiszta csatornák
   - Gyors visszajelzés

3. **Tudásmegosztás**
   - Közös wiki
   - Rendszeres képzések
   - Best practice megosztás

### Hatékonyság növelés

![Hatékonyság tippek](./screenshots/efficiency-tips.png)

**Ajánlások:**
- 🎯 Világos célok
- 📋 Sablonok használata
- 🔄 Automatizálás
- 📊 Rendszeres mérés
- 🎓 Folyamatos fejlesztés

### Skálázódás

![Csapat skálázás](./screenshots/team-scaling.png)

**Növekedési stratégia:**
1. Alcsapatok létrehozása
2. Delegálás
3. Automatizálás bővítése
4. Folyamatok finomítása
5. Teljesítmény optimalizálás

---

[⬅️ Előző: AI funkciók](./ai-features.md) | [Következő: Integrációk ➡️](./integrations.md)