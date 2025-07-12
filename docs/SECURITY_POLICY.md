# Security Policy / Biztonsági Szabályzat

*Version 1.0 - January 8, 2025 / 1.0 verzió - 2025. január 8.*

[English](#english) | [Magyar](#magyar)

---

## <a name="english"></a>English Version

### 1. Overview

HangJegyzet.AI is committed to protecting the confidentiality, integrity, and availability of our users' data. This Security Policy outlines our security measures, practices, and procedures to safeguard your information.

**Security Contact:**
- Email: security@hangjegyzet.ai
- Emergency: [24/7 Security Hotline]
- Vulnerability Disclosure: security@hangjegyzet.ai

### 2. Security Architecture

#### 2.1 Infrastructure Security
- **Hosting**: Hetzner Cloud (Germany) - ISO 27001 certified
- **Network**: Private VPC with strict firewall rules
- **Load Balancing**: Nginx with DDoS protection
- **CDN**: CloudFlare for static assets and additional security
- **Redundancy**: Multi-zone deployment with automatic failover

#### 2.2 Application Security
- **Framework**: Next.js 14 with security headers
- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Role-based access control (RBAC)
- **API Security**: Rate limiting, CORS, CSRF protection
- **Input Validation**: Strict validation on all user inputs

### 3. Data Protection

#### 3.1 Encryption Standards

| Data State | Method | Details |
|------------|--------|---------|
| At Rest | AES-256-GCM | All database fields, file storage |
| In Transit | TLS 1.3 | All client-server communication |
| Backups | AES-256-CBC | Encrypted before storage |
| Tokens | AES-256-GCM | OAuth tokens, API keys |
| Passwords | Argon2id | With salt, not reversible |

#### 3.2 Key Management
- **Key Storage**: Hardware Security Module (HSM) for master keys
- **Key Rotation**: Automatic rotation every 90 days
- **Key Escrow**: Secure backup with dual control
- **Access Control**: Principle of least privilege

### 4. Access Control

#### 4.1 Authentication
- **Password Requirements**:
  - Minimum 12 characters
  - Must include: uppercase, lowercase, numbers, symbols
  - No common passwords (checked against haveibeenpwned)
  - Password history (cannot reuse last 5)
  
- **Multi-Factor Authentication**:
  - TOTP (Time-based One-Time Password)
  - SMS backup (optional)
  - Recovery codes (one-time use)

#### 4.2 Authorization Matrix

| Role | Permissions | Scope |
|------|-------------|-------|
| Owner | Full access | Organization-wide |
| Admin | Manage users, settings | Organization-wide |
| Manager | View analytics, manage team | Team-wide |
| Member | Create, view own content | Personal |
| Guest | View shared content only | Limited |

#### 4.3 Session Management
- **Session Timeout**: 30 minutes of inactivity
- **Concurrent Sessions**: Maximum 5 per user
- **Session Tokens**: Rotated every 15 minutes
- **Device Tracking**: Optional device recognition

### 5. Application Security

#### 5.1 Secure Development
- **Code Reviews**: All code peer-reviewed before merge
- **Static Analysis**: SonarQube, ESLint security plugins
- **Dependency Scanning**: Daily vulnerability checks
- **Security Testing**: OWASP ZAP automated testing
- **Penetration Testing**: Annual third-party assessment

#### 5.2 Security Headers
```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://trusted-cdn.com
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

#### 5.3 API Security
- **Rate Limiting**:
  - General: 100 requests/minute
  - Auth endpoints: 5 requests/minute
  - Upload endpoints: 10 requests/hour
  
- **Input Validation**:
  - Type checking with TypeScript
  - Schema validation with Zod
  - File type verification
  - Size limits enforcement

### 6. Infrastructure Security

#### 6.1 Network Security
- **Firewall Rules**:
  ```
  ALLOW 443/tcp from ANY to WEB_SERVERS
  ALLOW 80/tcp from ANY to WEB_SERVERS (redirect to HTTPS)
  ALLOW 22/tcp from ADMIN_IPS to ALL_SERVERS
  ALLOW 5432/tcp from APP_SERVERS to DB_SERVERS
  DENY ALL OTHER
  ```

#### 6.2 Server Hardening
- **OS Security**:
  - Regular security patches (automated)
  - Minimal installed packages
  - SELinux/AppArmor enabled
  - Auditd logging enabled
  
- **Service Configuration**:
  - Non-root service accounts
  - Restricted file permissions
  - Disabled unnecessary services
  - Regular security scanning

### 7. Data Security

#### 7.1 Data Classification

| Classification | Examples | Security Requirements |
|---------------|----------|----------------------|
| Public | Marketing content | Basic protection |
| Internal | Meeting summaries | Encryption, access control |
| Confidential | Transcripts, recordings | Strong encryption, audit logs |
| Restricted | API keys, passwords | HSM storage, strict access |

#### 7.2 Data Handling
- **Processing**: Isolated containers per organization
- **Storage**: Encrypted volumes with access logs
- **Transmission**: Always encrypted, verified endpoints
- **Deletion**: Secure overwrite, certificate of destruction

### 8. Monitoring and Logging

#### 8.1 Security Monitoring
- **Real-time Monitoring**:
  - Intrusion detection (Suricata)
  - Anomaly detection (ML-based)
  - Failed login attempts
  - Suspicious API patterns
  
- **Log Collection**:
  - Centralized logging (ELK stack)
  - 90-day retention
  - Tamper-proof storage
  - Real-time analysis

#### 8.2 Audit Logging
All security-relevant events are logged:
```json
{
  "timestamp": "2025-01-08T10:30:00Z",
  "event_type": "auth.login",
  "user_id": "uuid",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "result": "success",
  "mfa_used": true,
  "session_id": "session_uuid"
}
```

### 9. Incident Response

#### 9.1 Incident Response Plan
1. **Detection** → Security monitoring alerts
2. **Triage** → Assess severity and impact
3. **Containment** → Isolate affected systems
4. **Investigation** → Root cause analysis
5. **Remediation** → Fix vulnerabilities
6. **Recovery** → Restore normal operations
7. **Lessons Learned** → Update procedures

#### 9.2 Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| Critical | Active breach | < 15 minutes | Data exfiltration |
| High | Imminent threat | < 1 hour | Authentication bypass |
| Medium | Potential risk | < 4 hours | Suspicious activity |
| Low | Minor issue | < 24 hours | Failed patch |

### 10. Business Continuity

#### 10.1 Backup Strategy
- **Frequency**: 
  - Database: Every 6 hours
  - Files: Daily incremental
  - Full backup: Weekly
  
- **Retention**:
  - Daily: 7 days
  - Weekly: 4 weeks
  - Monthly: 12 months

#### 10.2 Disaster Recovery
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 6 hours
- **DR Site**: Separate Hetzner datacenter
- **Testing**: Quarterly DR drills

### 11. Compliance

#### 11.1 Standards and Certifications
- **GDPR**: Full compliance with data protection
- **ISO 27001**: Certification in progress
- **SOC 2 Type II**: Planned for 2025
- **NIST Cybersecurity Framework**: Adopted

#### 11.2 Security Assessments
- **Vulnerability Scanning**: Weekly automated
- **Penetration Testing**: Annual third-party
- **Code Audits**: Quarterly
- **Compliance Audits**: Annual

### 12. User Security

#### 12.1 User Responsibilities
- Use strong, unique passwords
- Enable two-factor authentication
- Report suspicious activities
- Keep software updated
- Use secure networks

#### 12.2 Security Features for Users
- **Privacy Dashboard**: View all data and permissions
- **Security Alerts**: Email/SMS for suspicious activity
- **Activity Log**: View all account actions
- **Data Export**: Download all personal data
- **Account Deletion**: Permanent data removal

### 13. Third-Party Security

#### 13.1 Vendor Assessment
All third-party services must:
- Pass security assessment
- Sign data processing agreement
- Provide security certifications
- Allow audit rights
- Maintain cyber insurance

#### 13.2 Integration Security
- **OAuth 2.0**: For all third-party auth
- **Webhook Security**: HMAC signature verification
- **API Keys**: Scoped, rotatable, audited
- **Data Minimization**: Only necessary data shared

### 14. Vulnerability Disclosure

#### 14.1 Responsible Disclosure
We welcome security researchers to report vulnerabilities:
- **Email**: security@hangjegyzet.ai
- **PGP Key**: Available on our website
- **Response**: Within 48 hours
- **Fix Timeline**: Based on severity

#### 14.2 Bug Bounty Program
- **Scope**: *.hangjegyzet.ai domains
- **Rewards**: €100 - €5,000 based on impact
- **Safe Harbor**: No legal action for good faith research
- **Hall of Fame**: Public recognition (optional)

---

## <a name="magyar"></a>Magyar Változat

### 1. Áttekintés

A HangJegyzet.AI elkötelezett a felhasználói adatok bizalmasságának, integritásának és elérhetőségének védelme mellett. Ez a Biztonsági Szabályzat felvázolja biztonsági intézkedéseinket, gyakorlatainkat és eljárásainkat az információk védelmére.

**Biztonsági Kapcsolat:**
- Email: security@hangjegyzet.ai
- Vészhelyzet: [24/7 Biztonsági Forródrót]
- Sebezhetőség Bejelentés: security@hangjegyzet.ai

### 2. Biztonsági Architektúra

#### 2.1 Infrastruktúra Biztonság
- **Hosztolás**: Hetzner Cloud (Németország) - ISO 27001 tanúsított
- **Hálózat**: Privát VPC szigorú tűzfal szabályokkal
- **Terhelés Elosztás**: Nginx DDoS védelemmel
- **CDN**: CloudFlare statikus eszközökhöz és további biztonsághoz
- **Redundancia**: Több zónás telepítés automatikus átállással

#### 2.2 Alkalmazás Biztonság
- **Keretrendszer**: Next.js 14 biztonsági fejlécekkel
- **Hitelesítés**: Supabase Auth JWT tokenekkel
- **Jogosultság**: Szerepkör-alapú hozzáférés-szabályozás (RBAC)
- **API Biztonság**: Ráta korlátozás, CORS, CSRF védelem
- **Bemenet Ellenőrzés**: Szigorú validáció minden felhasználói bemeneten

### 3. Adatvédelem

#### 3.1 Titkosítási Szabványok

| Adat Állapot | Módszer | Részletek |
|--------------|---------|-----------|
| Nyugalomban | AES-256-GCM | Minden adatbázis mező, fájl tárolás |
| Átvitel közben | TLS 1.3 | Minden kliens-szerver kommunikáció |
| Mentések | AES-256-CBC | Tárolás előtt titkosítva |
| Tokenek | AES-256-GCM | OAuth tokenek, API kulcsok |
| Jelszavak | Argon2id | Sóval, nem visszafejthető |

#### 3.2 Kulcs Menedzsment
- **Kulcs Tárolás**: Hardware Security Module (HSM) mester kulcsokhoz
- **Kulcs Rotáció**: Automatikus rotáció 90 naponta
- **Kulcs Letét**: Biztonságos mentés kettős kontrollal
- **Hozzáférés Kontroll**: Legkisebb jogosultság elve

### 4. Hozzáférés Szabályozás

#### 4.1 Hitelesítés
- **Jelszó Követelmények**:
  - Minimum 12 karakter
  - Tartalmaznia kell: nagybetű, kisbetű, számok, szimbólumok
  - Nincs gyakori jelszó (haveibeenpwned ellenőrzés)
  - Jelszó előzmények (nem használható újra az utolsó 5)
  
- **Többfaktoros Hitelesítés**:
  - TOTP (Időalapú Egyszer Használatos Jelszó)
  - SMS tartalék (opcionális)
  - Helyreállítási kódok (egyszer használatos)

#### 4.2 Jogosultsági Mátrix

| Szerep | Engedélyek | Hatókör |
|--------|------------|---------|
| Tulajdonos | Teljes hozzáférés | Szervezet-szintű |
| Admin | Felhasználók, beállítások kezelése | Szervezet-szintű |
| Menedzser | Analitika megtekintése, csapat kezelése | Csapat-szintű |
| Tag | Saját tartalom létrehozása, megtekintése | Személyes |
| Vendég | Csak megosztott tartalom megtekintése | Korlátozott |

#### 4.3 Munkamenet Kezelés
- **Munkamenet Időtúllépés**: 30 perc inaktivitás
- **Egyidejű Munkamenetek**: Maximum 5 felhasználónként
- **Munkamenet Tokenek**: 15 percenként rotálva
- **Eszköz Követés**: Opcionális eszköz felismerés

### 5. Alkalmazás Biztonság

#### 5.1 Biztonságos Fejlesztés
- **Kód Áttekintések**: Minden kód peer-reviewed összevonás előtt
- **Statikus Elemzés**: SonarQube, ESLint biztonsági pluginok
- **Függőség Vizsgálat**: Napi sebezhetőség ellenőrzések
- **Biztonsági Tesztelés**: OWASP ZAP automatizált tesztelés
- **Penetrációs Tesztelés**: Éves harmadik fél értékelés

#### 5.2 Biztonsági Fejlécek
```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://trusted-cdn.com
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

#### 5.3 API Biztonság
- **Ráta Korlátozás**:
  - Általános: 100 kérés/perc
  - Auth végpontok: 5 kérés/perc
  - Feltöltés végpontok: 10 kérés/óra
  
- **Bemenet Validáció**:
  - Típus ellenőrzés TypeScript-tel
  - Séma validáció Zod-dal
  - Fájltípus ellenőrzés
  - Méret korlátok betartatása

### 6. Infrastruktúra Biztonság

#### 6.1 Hálózat Biztonság
- **Tűzfal Szabályok**:
  ```
  ENGEDÉLYEZ 443/tcp BÁRMELY-től WEB_SZERVEREK-hez
  ENGEDÉLYEZ 80/tcp BÁRMELY-től WEB_SZERVEREK-hez (átirányítás HTTPS-re)
  ENGEDÉLYEZ 22/tcp ADMIN_IP-ktől MINDEN_SZERVER-hez
  ENGEDÉLYEZ 5432/tcp APP_SZERVEREK-től DB_SZERVEREK-hez
  TILT MINDEN MÁS
  ```

#### 6.2 Szerver Megerősítés
- **OS Biztonság**:
  - Rendszeres biztonsági frissítések (automatizált)
  - Minimális telepített csomagok
  - SELinux/AppArmor engedélyezve
  - Auditd naplózás engedélyezve
  
- **Szolgáltatás Konfiguráció**:
  - Nem-root szolgáltatás fiókok
  - Korlátozott fájl jogosultságok
  - Letiltott szükségtelen szolgáltatások
  - Rendszeres biztonsági vizsgálat

### 7. Adat Biztonság

#### 7.1 Adat Osztályozás

| Osztályozás | Példák | Biztonsági Követelmények |
|-------------|--------|-------------------------|
| Nyilvános | Marketing tartalom | Alap védelem |
| Belső | Meeting összefoglalók | Titkosítás, hozzáférés kontroll |
| Bizalmas | Átiratok, felvételek | Erős titkosítás, audit naplók |
| Korlátozott | API kulcsok, jelszavak | HSM tárolás, szigorú hozzáférés |

#### 7.2 Adat Kezelés
- **Feldolgozás**: Izolált konténerek szervezetenként
- **Tárolás**: Titkosított kötetek hozzáférési naplókkal
- **Továbbítás**: Mindig titkosított, ellenőrzött végpontok
- **Törlés**: Biztonságos felülírás, törlési tanúsítvány

### 8. Megfigyelés és Naplózás

#### 8.1 Biztonsági Megfigyelés
- **Valós idejű Megfigyelés**:
  - Behatolás észlelés (Suricata)
  - Anomália észlelés (ML-alapú)
  - Sikertelen bejelentkezési kísérletek
  - Gyanús API minták
  
- **Napló Gyűjtés**:
  - Központosított naplózás (ELK stack)
  - 90 napos megőrzés
  - Hamisíthatatlan tárolás
  - Valós idejű elemzés

#### 8.2 Audit Naplózás
Minden biztonsági szempontból releváns esemény naplózva:
```json
{
  "timestamp": "2025-01-08T10:30:00Z",
  "event_type": "auth.login",
  "user_id": "uuid",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "result": "success",
  "mfa_used": true,
  "session_id": "session_uuid"
}
```

### 9. Incidens Kezelés

#### 9.1 Incidens Kezelési Terv
1. **Észlelés** → Biztonsági megfigyelés riasztások
2. **Osztályozás** → Súlyosság és hatás értékelése
3. **Elszigetelés** → Érintett rendszerek izolálása
4. **Vizsgálat** → Gyökérok elemzés
5. **Javítás** → Sebezhetőségek javítása
6. **Helyreállítás** → Normál működés visszaállítása
7. **Tanulságok** → Eljárások frissítése

#### 9.2 Súlyossági Szintek

| Szint | Leírás | Válaszidő | Példák |
|-------|--------|-----------|---------|
| Kritikus | Aktív behatolás | < 15 perc | Adat kiszivárgás |
| Magas | Közvetlen veszély | < 1 óra | Hitelesítés megkerülés |
| Közepes | Potenciális kockázat | < 4 óra | Gyanús tevékenység |
| Alacsony | Kisebb probléma | < 24 óra | Sikertelen frissítés |

### 10. Üzletmenet Folytonosság

#### 10.1 Mentési Stratégia
- **Gyakoriság**: 
  - Adatbázis: 6 óránként
  - Fájlok: Napi növekményes
  - Teljes mentés: Hetente
  
- **Megőrzés**:
  - Napi: 7 nap
  - Heti: 4 hét
  - Havi: 12 hónap

#### 10.2 Katasztrófa Helyreállítás
- **RTO** (Helyreállítási Idő Célkitűzés): 4 óra
- **RPO** (Helyreállítási Pont Célkitűzés): 6 óra
- **DR Hely**: Különálló Hetzner adatközpont
- **Tesztelés**: Negyedéves DR gyakorlatok

### 11. Megfelelőség

#### 11.1 Szabványok és Tanúsítványok
- **GDPR**: Teljes megfelelőség az adatvédelemmel
- **ISO 27001**: Tanúsítás folyamatban
- **SOC 2 Type II**: Tervezett 2025-re
- **NIST Kiberbiztonsági Keretrendszer**: Elfogadott

#### 11.2 Biztonsági Értékelések
- **Sebezhetőség Vizsgálat**: Heti automatizált
- **Penetrációs Tesztelés**: Éves harmadik fél
- **Kód Auditok**: Negyedéves
- **Megfelelőségi Auditok**: Éves

### 12. Felhasználói Biztonság

#### 12.1 Felhasználói Felelősségek
- Erős, egyedi jelszavak használata
- Kétfaktoros hitelesítés engedélyezése
- Gyanús tevékenységek jelentése
- Szoftver naprakészen tartása
- Biztonságos hálózatok használata

#### 12.2 Biztonsági Funkciók Felhasználóknak
- **Adatvédelmi Irányítópult**: Minden adat és engedély megtekintése
- **Biztonsági Riasztások**: Email/SMS gyanús tevékenységről
- **Tevékenység Napló**: Minden fiók művelet megtekintése
- **Adat Export**: Minden személyes adat letöltése
- **Fiók Törlés**: Végleges adat eltávolítás

### 13. Harmadik Fél Biztonság

#### 13.1 Szállító Értékelés
Minden harmadik fél szolgáltatásnak:
- Át kell mennie biztonsági értékelésen
- Alá kell írnia adatfeldolgozási megállapodást
- Biztonsági tanúsítványokat kell biztosítania
- Audit jogokat kell engedélyeznie
- Kiber biztosítást kell fenntartania

#### 13.2 Integráció Biztonság
- **OAuth 2.0**: Minden harmadik fél hitelesítéshez
- **Webhook Biztonság**: HMAC aláírás ellenőrzés
- **API Kulcsok**: Hatókörrel ellátott, rotálható, auditált
- **Adat Minimalizálás**: Csak szükséges adatok megosztása

### 14. Sebezhetőség Közzététel

#### 14.1 Felelős Közzététel
Üdvözöljük a biztonsági kutatókat sebezhetőségek jelentésére:
- **Email**: security@hangjegyzet.ai
- **PGP Kulcs**: Elérhető weboldalunkon
- **Válasz**: 48 órán belül
- **Javítási Időkeret**: Súlyosság alapján

#### 14.2 Bug Bounty Program
- **Hatókör**: *.hangjegyzet.ai domainek
- **Jutalmak**: €100 - €5.000 hatás alapján
- **Biztonságos Kikötő**: Nincs jogi lépés jóhiszemű kutatásért
- **Dicsőség Csarnok**: Nyilvános elismerés (opcionális)

---

## Security Checklist / Biztonsági Ellenőrzőlista

### For Users / Felhasználóknak
- [ ] Strong password (12+ characters)
- [ ] Two-factor authentication enabled
- [ ] Regular password changes (90 days)
- [ ] Secure network usage
- [ ] Suspicious activity monitoring

### For Administrators / Adminisztrátoroknak
- [ ] User access reviews (monthly)
- [ ] Security update installation
- [ ] Backup verification
- [ ] Log monitoring
- [ ] Incident response plan testing

---

*This Security Policy is effective as of January 8, 2025 / Ez a Biztonsági Szabályzat 2025. január 8-tól hatályos*