# Integrációk

A Hangjegyzet zökkenőmentesen kapcsolódik kedvenc eszközeihez és munkafolyamataihoz.

## 🔗 Integrációk áttekintése

### Videó bemutató
[![Integrációk bemutató](./screenshots/video-thumbnail-integrations.png)](https://hangjegyzet.hu/videos/integrations)
*Kattintson a teljes bemutató megtekintéséhez*

### Elérhető integrációk

![Integrációk dashboard](./screenshots/integrations-dashboard.png)

| Kategória | Szolgáltatások | Funkciók |
|-----------|----------------|----------|
| **Videókonferencia** | Zoom, Teams, Google Meet | Import, élő szinkron |
| **Felhő tárhely** | Google Drive, Dropbox, OneDrive | Auto-mentés, szinkron |
| **Projekt menedzsment** | Asana, Trello, Jira | Feladat export |
| **Kommunikáció** | Slack, Teams, Discord | Értesítések, megosztás |
| **CRM** | MiniCRM, Salesforce, HubSpot | Ügyfél szinkron |
| **Naptár** | Google Calendar, Outlook | Meeting import |

## 🎥 Zoom integráció

### Zoom kapcsolat beállítása

![Zoom beállítás](./screenshots/zoom-setup.png)

1. Lépjen az **Integrációk → Zoom** menübe
2. Kattintson a **"Zoom kapcsolása"** gombra
3. Jelentkezzen be Zoom fiókjába
4. Engedélyezze a hozzáférést
5. Válassza ki a szinkronizálási opciókat

### Automatikus import

![Zoom auto import](./screenshots/zoom-auto-import.png)

**Beállítási lehetőségek:**
- ✅ Összes felvétel importálása
- ✅ Csak saját meeting-ek
- ✅ Automatikus átírás
- ✅ Résztvevők szinkronizálása
- ✅ Chat import

### Élő Zoom átírás

![Élő Zoom átírás](./screenshots/zoom-live-transcription.png)

**Működés:**
1. Indítson Zoom meeting-et
2. Hangjegyzet automatikusan csatlakozik
3. Valós idejű átírás indul
4. Meeting végén teljes átírás

## 📁 Google Drive integráció

### Drive kapcsolat

![Google Drive setup](./screenshots/google-drive-setup.png)

1. **Integrációk → Google Drive**
2. **"Google fiók kapcsolása"**
3. Válassza ki a Google fiókot
4. Engedélyezze a hozzáférést
5. Válasszon mentési mappát

### Automatikus mentés

![Drive auto save](./screenshots/drive-auto-save.png)

**Mentési opciók:**
- 📄 Átírás (Google Docs)
- 🎵 Hangfájl (eredeti)
- 📊 Statisztikák (Sheets)
- 📁 Mappa struktúra

### Kétirányú szinkron

![Drive sync](./screenshots/drive-two-way-sync.png)

**Szinkronizálás:**
- ↗️ Hangjegyzet → Drive
- ↙️ Drive → Hangjegyzet
- 🔄 Változások követése
- ⚡ Azonnali frissítés

## 👥 Microsoft Teams integráció

### Teams beállítás

![Teams setup](./screenshots/teams-setup.png)

1. Lépjen az **Integrációk → Teams**
2. **"Microsoft bejelentkezés"**
3. Szervezeti fiók használata
4. Admin jóváhagyás (ha szükséges)
5. Csatornák kiválasztása

### Teams bot

![Teams bot](./screenshots/teams-bot.png)

**Bot funkciók:**
- 🤖 Automatikus értesítések
- 📝 Meeting összefoglalók
- 🔍 Keresés chat-ből
- 📊 Statisztikák lekérése
- 🎯 Feladatok létrehozása

### Meeting import

![Teams meeting import](./screenshots/teams-meeting-import.png)

Automatikus import:
- Rögzített meetingek
- Résztvevő lista
- Chat átírás
- Megosztott fájlok
- Meeting jegyzetek

## 💬 Slack integráció

### Slack app telepítése

![Slack installation](./screenshots/slack-installation.png)

1. **Integrációk → Slack**
2. **"Add to Slack"** gomb
3. Workspace kiválasztása
4. Csatorna hozzáférés
5. Bot telepítése

### Slack parancsok

![Slack commands](./screenshots/slack-commands.png)

**Elérhető parancsok:**
```
/hangjegyzet search [keresési szó]
/hangjegyzet latest
/hangjegyzet summary [meeting id]
/hangjegyzet share [meeting id]
/hangjegyzet help
```

### Értesítések Slackben

![Slack notifications](./screenshots/slack-notifications.png)

**Értesítés típusok:**
- ✅ Átírás kész
- 📋 Új akciólista
- 💬 Megjegyzés érkezett
- 🎯 Határidő közeleg
- 📊 Heti összefoglaló

## 📋 Projekt menedzsment integrációk

### Asana kapcsolat

![Asana integration](./screenshots/asana-integration.png)

**Funkciók:**
- Automatikus task létrehozás
- Projekt hozzárendelés
- Határidők szinkron
- Felelősök mapping
- Csatolmányok

### Trello integráció

![Trello integration](./screenshots/trello-integration.png)

**Kártya létrehozás:**
1. Válassza ki a board-ot
2. Válassza ki a listát
3. Akciók → Trello kártya
4. Automatikus kitöltés
5. Mentés

### Jira szinkron

![Jira sync](./screenshots/jira-sync.png)

**Támogatott típusok:**
- 🐛 Bug
- ✨ Story
- 📋 Task
- 🎯 Epic
- 🔧 Sub-task

## 📅 Naptár integrációk

### Google Calendar

![Google Calendar](./screenshots/google-calendar-integration.png)

**Automatikus funkciók:**
- Meeting import
- Résztvevők szinkron
- Időpont frissítés
- Emlékeztetők
- Meeting link

### Outlook Calendar

![Outlook Calendar](./screenshots/outlook-calendar-integration.png)

**Exchange szinkron:**
- Céges naptár
- Meeting room-ok
- Résztvevő státusz
- Konfliktus kezelés
- Meghívó válaszok

## 🏢 CRM integrációk

### MiniCRM kapcsolat

![MiniCRM integration](./screenshots/minicrm-integration.png)

**Szinkronizált adatok:**
- 👤 Ügyfelek
- 🏢 Cégek
- 📞 Kapcsolattartók
- 📝 Meeting jegyzetek
- 📊 Aktivitás log

### Salesforce integráció

![Salesforce integration](./screenshots/salesforce-integration.png)

**Automatizálás:**
- Lead követés
- Opportunity update
- Activity logging
- Custom field mapping
- Workflow trigger

## 🔧 Webhook-ok és API

### Webhook beállítás

![Webhook setup](./screenshots/webhook-setup.png)

**Webhook események:**
```javascript
{
  "event": "transcription.completed",
  "meeting_id": "12345",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "duration": 3600,
    "language": "hu",
    "speakers": 4
  }
}
```

### API kulcs kezelés

![API keys](./screenshots/api-keys.png)

**API használat:**
1. Generáljon API kulcsot
2. Állítsa be a jogosultságokat
3. Használja a dokumentáció szerint
4. Figyelje a használatot
5. Rotálja rendszeresen

### Zapier integráció

![Zapier integration](./screenshots/zapier-integration.png)

**Népszerű Zap-ek:**
- Hangjegyzet → Email
- Form → Hangjegyzet
- Hangjegyzet → CRM
- Calendar → Hangjegyzet
- Hangjegyzet → Spreadsheet

## 🎯 Integráció menedzsment

### Kapcsolatok áttekintése

![Integration overview](./screenshots/integration-overview.png)

**Dashboard elemek:**
- Aktív kapcsolatok
- Használati statisztikák
- Hibák és figyelmeztetések
- Szinkron állapot
- Következő futás

### Hibakezelés

![Error handling](./screenshots/integration-errors.png)

**Gyakori hibák:**
- 🔌 Kapcsolat megszakadt
- 🔑 Lejárt token
- 📊 Kvóta túllépés
- 🚫 Jogosultság hiány
- ⏰ Időtúllépés

### Integráció tesztelés

![Integration testing](./screenshots/integration-testing.png)

**Teszt lépések:**
1. Kapcsolat ellenőrzés
2. Adat szinkron teszt
3. Webhook ping
4. Hibakezelés teszt
5. Teljesítmény mérés

## 💡 Haladó integrációs tippek

### Automatizálási receptek

![Automation recipes](./screenshots/automation-recipes.png)

**Népszerű automatizálások:**

1. **Sales workflow**
   - CRM → Calendar → Hangjegyzet → CRM
   - Automatikus follow-up

2. **Team workflow**
   - Teams/Zoom → Hangjegyzet → Slack → Asana
   - Teljes meeting pipeline

3. **Personal workflow**
   - Calendar → Hangjegyzet → Notion → Email
   - Személyes produktivitás

### Integráció optimalizálás

![Integration optimization](./screenshots/integration-optimization.png)

**Best practices:**
- 🎯 Csak szükséges adatok
- ⏰ Ütemezett szinkron
- 🔄 Inkrementális update
- 📊 Teljesítmény monitoring
- 🛡️ Biztonsági audit

### Multi-integráció

![Multi integration](./screenshots/multi-integration.png)

**Komplex workflow példa:**
1. Zoom meeting rögzítés
2. Hangjegyzet átírás
3. AI összefoglaló
4. Slack értesítés
5. Asana task-ok
6. CRM frissítés
7. Drive mentés

## 🔒 Biztonsági szempontok

### OAuth engedélyek

![OAuth permissions](./screenshots/oauth-permissions.png)

**Ellenőrizze:**
- Minimális jogosultságok
- Scope korlátozások
- Token lejárat
- Refresh mechanizmus
- Visszavonási lehetőség

### Adatvédelem

![Integration privacy](./screenshots/integration-privacy.png)

**Védelem:**
- 🔐 Titkosított kapcsolat
- 🚫 Nincs harmadik fél
- 📝 Audit log
- 🏷️ Adat címkézés
- 🗑️ Törlési jog

---

[⬅️ Előző: Csapatmunka](./teams.md) | [Következő: Keresés és szűrés ➡️](./search.md)