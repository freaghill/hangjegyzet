# Zoom integráció

Kapcsolja össze Zoom fiókját a Hangjegyzettel, és automatikusan importálja és dolgozza fel a felhőben rögzített meetingjeit.

## 🚀 Főbb funkciók

### Automatikus importálás
- ✅ Felhő felvételek automatikus észlelése
- ✅ Meeting befejezése után azonnali feldolgozás
- ✅ Átírás és AI elemzés egy kattintásra
- ✅ Résztvevők automatikus azonosítása

### Szinkronizálás
- 📅 Utolsó 30 nap felvételeinek importálása
- 🔄 Valós idejű frissítések
- 📊 Tömeges feldolgozás
- 🗑️ Opcionális Zoom törlés import után

## 🔧 Beállítás

### 1. Zoom fiók kapcsolása

1. **Lépjen a Beállítások → Integrációk menübe**
2. **Kattintson a "Zoom kapcsolása" gombra**
3. **Jelentkezzen be Zoom fiókjába**
4. **Engedélyezze a szükséges jogosultságokat**

### 2. Szükséges Zoom beállítások

A Zoom fiókjában engedélyezze:
- ☁️ **Felhő felvétel** (Cloud Recording)
- 🔊 **Hang felvétel** (Audio Recording)
- 📝 **Opcionális**: Automatikus átírás

### 3. Import beállítások

**Automatikus import:**
- 🟢 **Bekapcsolva**: Minden új felvétel automatikusan importálódik
- 🔴 **Kikapcsolva**: Manuálisan választhatja ki a felvételeket

**Import után:**
- 📁 **Megtartás**: Felvétel megmarad a Zoom-ban
- 🗑️ **Törlés**: Helytakarékosság a Zoom tárhelyen

## 📥 Használat

### Automatikus folyamat

1. **Zoom meeting befejezése**
   - Felvétel feldolgozása a Zoom szervereken (5-30 perc)

2. **Hangjegyzet értesítés**
   - Email értesítés az importálásról
   - Meeting megjelenik a listában

3. **Automatikus feldolgozás**
   - Átírás készítése
   - AI elemzések futtatása
   - Beszélők azonosítása

### Manuális importálás

1. **Zoom felvételek lista**
   ```
   Beállítások → Zoom → Felvételek szinkronizálása
   ```

2. **Válassza ki a meetingeket**
   - Jelölje be az importálandókat
   - Kattintson az "Importálás" gombra

3. **Feldolgozás követése**
   - Valós idejű státusz
   - Becsült befejezési idő

## 🎯 Résztvevő párosítás

### Automatikus párosítás

A rendszer összekapcsolja:
- Zoom résztvevő nevek → Hangjegyzet beszélők
- Email címek alapján → Felhasználói profilok
- Korábbi meetingek → Hangprofilok

### Manuális javítás

Ha szükséges, utólag módosíthatja:
1. Meeting megnyitása
2. "Beszélők kezelése"
3. Nevek hozzárendelése

## 📊 Támogatott meeting típusok

### ✅ Támogatott
- Normál meetingek
- Visszatérő meetingek
- Webinárok (résztvevői hanggal)
- Breakout room-ok (fő felvétel)

### ⚠️ Korlátozások
- Csak felhő felvételek (nem helyi)
- Maximum 5 óra hosszúság
- Minimum 2 perc hosszúság
- Hang nélküli felvételek nem támogatottak

## 🔒 Biztonság és adatvédelem

### Adatáramlás
1. **Zoom → Hangjegyzet**
   - Titkosított kapcsolat
   - Közvetlen letöltés
   - Nincs harmadik fél

2. **Tárolás**
   - EU szervereken
   - Titkosított fájlok
   - GDPR megfelelő

### Jogosultságok
A Hangjegyzet csak ezeket kéri:
- 📹 Felvételek olvasása
- 👤 Felhasználó profil (név, email)
- 🗑️ Opcionális: felvétel törlés

NEM fér hozzá:
- ❌ Élő meetingekhez
- ❌ Chat üzenetekhez
- ❌ Képernyőmegosztáshoz
- ❌ Más felhasználók adataihoz

## 💡 Tippek és trükkök

### Jobb minőségért

1. **Zoom beállítások optimalizálása:**
   - "Külön hangfájl rögzítése" BE
   - "Optimalizálás 3. fél szerkesztőhöz" BE
   - Original Sound engedélyezése

2. **Meeting közben:**
   - Kérje a résztvevőket némításra amikor nem beszélnek
   - Használjanak fejhallgatót
   - Kerüljék a háttérzajt

### Hatékony munkához

1. **Előre beállított sablonok:**
   - Heti státusz → Automatikus akciólista
   - Ügyfél meeting → Részletes összefoglaló
   - Brainstorming → Ötlet kiemelés

2. **Automatizálás:**
   - Email értesítések beállítása
   - Csapat megosztás szabályok
   - Címke alapú rendszerezés

## ❓ Gyakori kérdések

**K: Mennyibe kerül a Zoom integráció?**
V: Az integráció ingyenes, csak az átírási kreditekbe kerül.

**K: Mennyi ideig tart az import?**
V: A Zoom feldolgozása után 1-2 percen belül elérhető.

**K: Mi történik ha megszüntetem a kapcsolatot?**
V: A már importált meetingek megmaradnak, újak nem importálódnak.

**K: Lehet szűrni mely meetingek importálódjanak?**
V: Jelenleg minden felhő felvétel importálható, szűrés tervezett funkció.

**K: Működik ingyenes Zoom fiókkal?**
V: Igen, de csak ha van felhő felvétel tárhely (általában Pro fiók kell).

## 🚨 Hibaelhárítás

### "Nincs jogosultság" hiba
1. Kapcsolja szét és újra a Zoom integrációt
2. Ellenőrizze a Zoom admin beállításokat
3. Győződjön meg róla hogy Cloud Recording engedélyezett

### Nem jelennek meg a felvételek
1. Várjon 30 percet a meeting után
2. Ellenőrizze hogy felhő felvétel volt-e
3. Próbálja a manuális szinkronizálást

### Rossz beszélő azonosítás
1. Ellenőrizze a Zoom résztvevő neveket
2. Használja a Hangjegyzet név párosítást
3. Építsen hangprofilokat többszöri használattal

---

[⬅️ Beszélő azonosítás](/docs/speaker-identification) | [További integrációk →](/docs/integrations)