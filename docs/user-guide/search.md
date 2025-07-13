# Keresés és szűrés

A Hangjegyzet fejlett keresési funkciói segítenek gyorsan megtalálni a keresett információt a találkozók között.

## 🔍 Keresési alapok

### Videó bemutató
[![Keresés bemutató](./screenshots/video-thumbnail-search.png)](https://hangjegyzet.hu/videos/search-features)
*Kattintson a teljes bemutató megtekintéséhez*

### Gyorskeresés

![Gyorskeresés](./screenshots/quick-search.png)

**Használat:**
- Billentyűparancs: `Ctrl/Cmd + K`
- Vagy kattintson a keresőmezőre
- Kezdjen el gépelni
- Azonnali találatok megjelennek

**Keresési helyek:**
- 📝 Átírás szövegében
- 🏷️ Címkékben
- 📋 Találkozó címekben
- 👤 Résztvevő nevekben
- 💬 Megjegyzésekben

### Keresési szintaxis

![Keresési szintaxis](./screenshots/search-syntax.png)

**Speciális operátorok:**

| Operátor | Példa | Jelentés |
|----------|-------|----------|
| `" "` | `"pontos kifejezés"` | Pontos egyezés |
| `AND` | `budget AND marketing` | Mindkettő szerepel |
| `OR` | `sales OR értékesítés` | Valamelyik szerepel |
| `NOT` | `meeting NOT internal` | Kizárás |
| `*` | `mark*` | Joker karakter |
| `~` | `~költség` | Hasonló szavak |

### Intelligens keresés

![Intelligens keresés](./screenshots/smart-search.png)

**AI funkciók:**
- 🧠 Szinoníma felismerés
- 🌐 Többnyelvű keresés
- 📊 Kontextus alapú találatok
- 🎯 Relevancia szerinti sorrend
- 💡 Keresési javaslatok

## 🎯 Speciális szűrők

### Szűrő panel

![Szűrő panel](./screenshots/filter-panel.png)

**Elérhető szűrők:**
- 📅 **Dátum tartomány**
- 👥 **Résztvevők**
- 🏷️ **Címkék**
- 🗣️ **Beszélők**
- ⏱️ **Időtartam**
- 🌍 **Nyelv**
- 📊 **Státusz**
- 🏢 **Csapat**

### Dátum szűrés

![Dátum szűrő](./screenshots/date-filter.png)

**Gyors választók:**
- Ma
- Tegnap
- Ez a hét
- Múlt hét
- Ez a hónap
- Múlt hónap
- Egyéni tartomány

**Relatív dátumok:**
- `last 7 days`
- `past month`
- `since January`
- `before 2024`

### Résztvevő szűrés

![Résztvevő szűrő](./screenshots/participant-filter.png)

**Szűrési opciók:**
- Konkrét személy
- Résztvevők száma
- Belső/külső
- Szerepkör szerint
- Részleg szerint

### Többszintű szűrés

![Többszintű szűrés](./screenshots/multi-level-filter.png)

**Kombinált feltételek:**
```
Dátum: Múlt hónap
ÉS Résztvevő: János
ÉS Címke: Projekt X
ÉS Időtartam: > 30 perc
```

## 🔎 Keresés az átírásban

### Szövegkeresés

![Szövegkeresés](./screenshots/text-search.png)

**Funkciók:**
- 🔍 Valós idejű kiemelés
- 🔢 Találatok száma
- ⬆️⬇️ Navigáció a találatok között
- 📍 Kontextus megjelenítés
- 🎯 Ugrás időpontra

### Keresés és csere

![Keresés csere](./screenshots/search-replace.png)

**Használat:**
1. `Ctrl/Cmd + H` megnyitása
2. Keresett szöveg megadása
3. Csere szöveg megadása
4. Opciók:
   - Kis/nagybetű érzékeny
   - Teljes szó
   - Regex
5. Csere egy/összes

### Regex keresés

![Regex keresés](./screenshots/regex-search.png)

**Példák:**
- `\b\d{4}\b` - 4 számjegy
- `[A-Z]{2,}` - Nagybetűs rövidítések
- `\$\d+` - Dollár összegek
- `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b` - Email címek

## 📊 Keresési eredmények

### Eredmény lista

![Keresési eredmények](./screenshots/search-results.png)

**Megjelenített információk:**
- 📄 Találkozó címe
- 📅 Dátum
- ⏱️ Időtartam
- 👥 Résztvevők
- 📝 Releváns részlet
- 🔍 Találatok száma

### Rendezési opciók

![Rendezés](./screenshots/sort-options.png)

**Rendezés szerint:**
- 🎯 Relevancia (alapértelmezett)
- 📅 Dátum (új → régi)
- 📅 Dátum (régi → új)
- 🔤 Név (A → Z)
- ⏱️ Időtartam
- 👥 Résztvevők száma

### Találat előnézet

![Találat előnézet](./screenshots/result-preview.png)

**Előnézet funkciók:**
- Kontextus kiemelése
- Találat körüli szöveg
- Időpont megjelenítése
- Beszélő azonosítása
- Gyors műveletek

## 🎨 Mentett keresések

### Keresés mentése

![Keresés mentése](./screenshots/save-search.png)

1. Végezzen keresést
2. Kattintson a **"Mentés"** gombra
3. Adjon nevet
4. Válasszon ikont
5. Opcionális: értesítés új találatról

### Mentett keresések kezelése

![Mentett keresések](./screenshots/saved-searches.png)

**Funkciók:**
- 📌 Rögzítés a sávra
- 🔔 Értesítések beállítása
- 📊 Használati statisztika
- 🔄 Frissítés
- 🗑️ Törlés

### Dinamikus keresések

![Dinamikus keresések](./screenshots/dynamic-searches.png)

**Automatikus frissülő keresések:**
- "Mai meetingek"
- "Múlt heti akciók"
- "Sürgős témák"
- "Megoldatlan kérdések"

## 🏷️ Címke alapú keresés

### Címke böngésző

![Címke böngésző](./screenshots/tag-browser.png)

**Címke fa nézet:**
- Hierarchikus struktúra
- Címkék száma
- Színkódolás
- Gyors szűrés
- Többszörös kijelölés

### Címke kombináció

![Címke kombináció](./screenshots/tag-combination.png)

**Logikai műveletek:**
- `tag:projekt AND tag:sürgős`
- `tag:ügyfél OR tag:partner`
- `tag:belső NOT tag:bizalmas`

## 🗣️ Beszélő keresés

### Beszélő szűrő

![Beszélő szűrő](./screenshots/speaker-filter.png)

**Keresési opciók:**
- Konkrét beszélő
- Beszélő kombinációk
- Ismeretlen beszélők
- Beszédidő szerint
- Megszólalások száma

### Beszélő analitika

![Beszélő analitika](./screenshots/speaker-analytics.png)

**Statisztikák:**
- Top beszélők
- Átlagos beszédidő
- Gyakori témák
- Együtt szereplések
- Időbeli trend

## 🌐 Többnyelvű keresés

### Nyelv felismerés

![Nyelv felismerés](./screenshots/language-detection.png)

**Automatikus funkciók:**
- Nyelv azonosítás
- Keresztnyelvi keresés
- Fordítás alapú találatok
- Többnyelvű szűrés

### Fordított keresés

![Fordított keresés](./screenshots/translated-search.png)

**Példa:**
- Keresés: "budget"
- Találatok: "budget", "költségvetés", "büdzsé"

## 📱 Mobil keresés

### Mobil keresési felület

![Mobil keresés](./screenshots/mobile-search.png)

**Optimalizált funkciók:**
- Hangalapú keresés
- Gesztus navigáció
- Kompakt eredmények
- Offline keresés
- Szinkronizált előzmények

### Hangvezérelt keresés

![Hang keresés](./screenshots/voice-search.png)

**Használat:**
1. Nyomja meg a mikrofon ikont
2. Mondja ki a keresést
3. Automatikus feldolgozás
4. Eredmények megjelenítése

## 💡 Keresési tippek

### Hatékony keresés

![Keresési tippek](./screenshots/search-tips.png)

1. **Kezdje általánosan**
   - Majd szűkítse szűrőkkel

2. **Használjon idézőjeleket**
   - Pontos kifejezésekhez

3. **Kombinálja a szűrőket**
   - Gyorsabb eredmények

4. **Mentse a gyakori kereséseket**
   - Időmegtakarítás

5. **Használja a javaslatokat**
   - AI segítség

### Keresési példák

**Komplex keresések:**

1. **Projekt státusz:**
   ```
   "projekt státusz" AND tag:heti 
   AND date:last-7-days
   ```

2. **Ügyfél említések:**
   ```
   (ACME OR "Nagy Ügyfél") 
   AND speaker:értékesítés
   ```

3. **Akciólista:**
   ```
   ("teendő" OR "akcióE" OR "feladat") 
   AND NOT status:completed
   ```

### Hibaelhárítás

![Keresés hibaelhárítás](./screenshots/search-troubleshooting.png)

**Nincs találat?**
- Ellenőrizze a helyesírást
- Bővítse a dátum tartományt
- Használjon kevesebb szűrőt
- Próbáljon szinonímákat
- Ellenőrizze a jogosultságokat

---

[⬅️ Előző: Integrációk](./integrations.md) | [Következő: Fizetés és előfizetések ➡️](./billing.md)