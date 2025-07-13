import { EmailTemplate } from '../types'

export const welcomeTemplate: EmailTemplate = {
  id: 'welcome',
  name: 'Üdvözlő email',
  subject: 'Üdvözöljük a Hangjegyzetben, {{userName}}!',
  htmlContent: `
    <h2>Kedves {{userName}}!</h2>
    
    <p>Örömmel üdvözöljük a Hangjegyzet közösségében! Köszönjük, hogy minket választott meeting jegyzetelési és átírási feladataihoz.</p>
    
    <p>A Hangjegyzet segítségével:</p>
    <ul>
      <li>🎙️ <strong>Automatikusan átírhatja</strong> meeting felvételeit</li>
      <li>🔍 <strong>Kereshet</strong> az átírásokban</li>
      <li>📊 <strong>Összefoglalókat készíthet</strong> a megbeszélésekről</li>
      <li>👥 <strong>Megoszthatja</strong> jegyzeteit csapatával</li>
      <li>📱 <strong>Bárhonnan elérheti</strong> dokumentumait</li>
    </ul>
    
    <div class="divider"></div>
    
    <h3>🚀 Kezdje el most!</h3>
    <p>Az első meeting feltöltése egyszerű:</p>
    <ol>
      <li>Kattintson az "Új meeting" gombra</li>
      <li>Töltse fel audio vagy videó fájlját (max. 2GB)</li>
      <li>Válassza ki az átírás pontosságát</li>
      <li>Mi elvégezzük a többit!</li>
    </ol>
    
    <div style="text-align: center;">
      <a href="{{dashboardUrl}}" class="button">Irány a vezérlőpult</a>
    </div>
    
    <div class="divider"></div>
    
    <h3>💡 Hasznos tippek</h3>
    <div class="success">
      <p><strong>Tipp:</strong> A legjobb eredmény érdekében használjon jó minőségű felvételeket, minimális háttérzajjal.</p>
    </div>
    
    <p>Ha bármilyen kérdése van, ne habozzon felvenni velünk a kapcsolatot:</p>
    <ul>
      <li>📧 Email: <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></li>
      <li>📚 Dokumentáció: <a href="{{docsUrl}}">{{docsUrl}}</a></li>
    </ul>
    
    <p>Üdvözlettel,<br>
    A Hangjegyzet csapata</p>
  `,
  textContent: `
Kedves {{userName}}!

Örömmel üdvözöljük a Hangjegyzet közösségében! Köszönjük, hogy minket választott meeting jegyzetelési és átírási feladataihoz.

A Hangjegyzet segítségével:
- Automatikusan átírhatja meeting felvételeit
- Kereshet az átírásokban
- Összefoglalókat készíthet a megbeszélésekről
- Megoszthatja jegyzeteit csapatával
- Bárhonnan elérheti dokumentumait

KEZDJE EL MOST!
Az első meeting feltöltése egyszerű:
1. Kattintson az "Új meeting" gombra
2. Töltse fel audio vagy videó fájlját (max. 2GB)
3. Válassza ki az átírás pontosságát
4. Mi elvégezzük a többit!

Látogasson el a vezérlőpultra: {{dashboardUrl}}

HASZNOS TIPPEK
Tipp: A legjobb eredmény érdekében használjon jó minőségű felvételeket, minimális háttérzajjal.

Ha bármilyen kérdése van, ne habozzon felvenni velünk a kapcsolatot:
- Email: {{supportEmail}}
- Dokumentáció: {{docsUrl}}

Üdvözlettel,
A Hangjegyzet csapata
  `,
  variables: [
    {
      name: 'userName',
      description: 'A felhasználó neve',
      required: true
    },
    {
      name: 'dashboardUrl',
      description: 'Link a vezérlőpulthoz',
      required: true,
      defaultValue: 'https://hangjegyzet.hu/dashboard'
    },
    {
      name: 'supportEmail',
      description: 'Support email cím',
      required: false,
      defaultValue: 'support@hangjegyzet.hu'
    },
    {
      name: 'docsUrl',
      description: 'Dokumentáció URL',
      required: false,
      defaultValue: 'https://docs.hangjegyzet.hu'
    }
  ],
  category: 'transactional',
  language: 'hu'
}