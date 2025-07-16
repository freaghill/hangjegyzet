# Beszélő azonosítás

A Hangjegyzet fejlett beszélő azonosítási technológiája automatikusan megkülönbözteti a résztvevőket, és személyhez köti a megszólalásokat.

## 🎯 Hogyan működik?

### Hangalapú azonosítás

A rendszer több lépésben azonosítja a beszélőket:

1. **Hangminták elemzése**
   - Egyedi hangjellemzők felismerése
   - Beszédtempó és stílus
   - Hangmagasság és tónus
   - Hangerő dinamika

2. **Szegmentálás**
   - Beszélőváltások észlelése
   - Átfedések kezelése
   - Csend periódusok
   - Háttérzaj szűrése

3. **Klaszterezés**
   - Hasonló hangminták csoportosítása
   - Beszélők számának meghatározása
   - Konzisztencia ellenőrzés
   - Minőségi küszöbök

## 👥 Azonosítási módok

### Automatikus mód
**Működés**: AI automatikusan számozza a beszélőket  
**Jelölés**: Beszélő 1, Beszélő 2, stb.  
**Pontosság**: 85-95% (körülményektől függően)

**Előnyök:**
- Azonnali eredmény
- Nincs előzetes beállítás
- Költséghatékony
- Gyors feldolgozás

**Korlátok:**
- Csak számozott azonosítók
- Meeting között nincs folytonosság
- Néha összekeverheti a hasonló hangokat

### Névvel ellátott mód
**Működés**: Felhasználó megadja a résztvevők nevét  
**Beállítás**: Meeting előtt vagy után  
**Pontosság**: 90-98%

**Hogyan állítsa be:**
1. Meeting létrehozásakor adja meg a résztvevőket
2. Vagy utólag rendelje hozzá a neveket
3. AI megtanulja a hang-név párosítást
4. Következő meetingen automatikusan felismeri

### Hangprofil mód
**Működés**: Résztvevők hangmintáinak hosszú távú tanulása  
**Követelmény**: Professional vagy Enterprise csomag  
**Pontosság**: 95-99%

**Jellemzők:**
- Egyedi hangprofilok létrehozása
- Meetingek közötti felismerés
- Folyamatos tanulás és javulás
- Csapatszintű profilok

## 📊 Pontossági tényezők

### Ami javítja a pontosságot

**Technikai feltételek:**
- ✅ Jó minőségű mikrofon
- ✅ Tiszta hangfelvétel
- ✅ Minimális háttérzaj
- ✅ Egyenletes hangerő

**Meeting körülmények:**
- ✅ Maximum 6-8 résztvevő
- ✅ Nem beszélnek egyszerre
- ✅ Tiszta, artikulált beszéd
- ✅ Legalább 30 másodperc/fő

**Beállítások:**
- ✅ Résztvevők előzetes megadása
- ✅ Hangprofilok használata
- ✅ Megfelelő átírási mód

### Ami rontja a pontosságot

**Nehéz körülmények:**
- ❌ Rossz audio minőség
- ❌ Sok háttérzaj
- ❌ Egyszerre beszélés
- ❌ 10+ résztvevő

**Speciális esetek:**
- ❌ Nagyon hasonló hangok (pl. testvérek)
- ❌ Betegség miatti hangváltozás
- ❌ Erős háttérzaj vagy visszhang
- ❌ Telefonos résztvevők

## 🛠️ Beállítási lehetőségek

### Meeting előtti beállítás

```
1. Új meeting → Résztvevők hozzáadása
2. Név és email megadása
3. Opcionális: korábbi hangminta kiválasztása
4. Meeting indítása
```

### Utólagos korrekció

```
1. Átírás megnyitása
2. Beszélő név melletti ✏️ ikon
3. Név módosítása vagy csere
4. AI újratanulja a párosítást
```

### Tömeges módosítás

```
1. "Beszélők kezelése" menü
2. Beszélők egyesítése vagy szétválasztása
3. Globális névcsere
4. Változások alkalmazása
```

## 🎨 Megjelenítési opciók

### Átírásban

**Klasszikus nézet:**
```
János: Üdvözlöm a mai megbeszélésen.
Anna: Köszönöm, örülök hogy itt lehetek.
Péter: Kezdjük az első napirendi ponttal.
```

**Időbélyeges nézet:**
```
[00:00:15] János: Üdvözlöm a mai megbeszélésen.
[00:00:18] Anna: Köszönöm, örülök hogy itt lehetek.
[00:00:22] Péter: Kezdjük az első napirendi ponttal.
```

**Színkódolt nézet:**
- Minden beszélő egyedi színt kap
- Vizuális megkülönböztetés
- Könnyebb követhetőség

### Elemzésekben

**Beszédidő diagram:**
- Ki mennyi ideig beszélt
- Százalékos megoszlás
- Időbeli eloszlás

**Interakció térkép:**
- Ki kinek válaszolt
- Párbeszéd minták
- Domináns beszélők

## 🔐 Adatvédelem

### Hangminták kezelése

**Tárolás:**
- Titkosított formában
- EU szervereken
- Felhasználó tulajdonában
- Bármikor törölhető

**Felhasználás:**
- Csak az Ön meetingjeihez
- Nincs megosztás más fiókokkal
- Nincs AI modell tanítás
- GDPR megfelelő

### Hozzáférés kontroll

**Jogosultságok:**
- Csak a meeting résztvevői látják
- Admin módosíthat neveket
- Vendégek csak olvashatnak
- Audit napló minden változásról

## 💡 Legjobb gyakorlatok

### Meeting kezdete

1. **Bemutatkozás**
   - Mindenki mondjon pár mondatot
   - Segít az AI-nak a hangok megtanulásában
   - "Körbeadjuk a szót" módszer

2. **Tiszta beszéd**
   - Ne beszéljenek egyszerre
   - Várják meg míg a másik befejezi
   - Kerüljék a háttérbeszélgetést

### Rendszeres meetingek

1. **Hangprofilok építése**
   - Ugyanazok a résztvevők
   - Konzisztens nevek használata
   - AI egyre pontosabb lesz

2. **Sablon használat**
   - Meeting sablonok résztvevőkkel
   - Automatikus név hozzárendelés
   - Időmegtakarítás

## ❓ Gyakori kérdések

**K: Működik telefonkonferencián?**
V: Igen, de a pontosság alacsonyabb lehet a telefon hangminősége miatt.

**K: Hány beszélőt tud megkülönböztetni?**
V: Optimálisan 2-8 főt, maximum 15 főt tud kezelni.

**K: Mi történik ha valaki később csatlakozik?**
V: Az AI automatikusan észleli és új beszélőként jelöli.

**K: Lehet exportálni beszélőnként?**
V: Igen, az export opcióknál választható beszélőnkénti szétválasztás.

**K: Mennyire biztonságos a hangom tárolása?**
V: Maximálisan biztonságos - titkosított, EU-ban tárolt, bármikor törölhető.

---

[⬅️ AI összefoglalók](/docs/ai-summaries) | [Zoom integráció →](/docs/integrations/zoom)