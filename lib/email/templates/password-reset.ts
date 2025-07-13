import { EmailTemplate } from '../types'

export const passwordResetTemplate: EmailTemplate = {
  id: 'password-reset',
  name: 'Jelszó visszaállítás',
  subject: 'Jelszó visszaállítás - Hangjegyzet',
  htmlContent: `
    <h2>Kedves {{userName}}!</h2>
    
    <p>Jelszó visszaállítási kérelmet kaptunk az Ön Hangjegyzet fiókjához.</p>
    
    <div class="alert">
      <p style="margin: 0;"><strong>⚠️ Fontos:</strong> Ha nem Ön kezdeményezte ezt a kérést, kérjük hagyja figyelmen kívül ezt az emailt, és fiókja biztonságban marad.</p>
    </div>
    
    <p>A jelszava visszaállításához kattintson az alábbi gombra:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetUrl}}" class="button">Új jelszó beállítása</a>
    </div>
    
    <p style="text-align: center; color: #6b7280;">
      Ez a link <strong>{{expiryHours}} óráig</strong> érvényes.
    </p>
    
    <div class="divider"></div>
    
    <h3>🔒 Biztonsági tippek</h3>
    <ul>
      <li>Használjon erős, egyedi jelszót</li>
      <li>Legalább 8 karakter hosszú legyen</li>
      <li>Tartalmazzon kis- és nagybetűket, számokat</li>
      <li>Ne használja más weboldalakon</li>
    </ul>
    
    <p style="color: #6b7280; font-size: 14px;">
      <strong>Technikai információk:</strong><br>
      IP cím: {{ipAddress}}<br>
      Böngésző: {{userAgent}}<br>
      Időpont: {{requestTime}}
    </p>
    
    <p>Ha bármilyen kérdése van, vagy segítségre van szüksége, írjon nekünk: 
    <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
    
    <p>Üdvözlettel,<br>
    A Hangjegyzet csapata</p>
  `,
  textContent: `
Kedves {{userName}}!

Jelszó visszaállítási kérelmet kaptunk az Ön Hangjegyzet fiókjához.

⚠️ FONTOS: Ha nem Ön kezdeményezte ezt a kérést, kérjük hagyja figyelmen kívül ezt az emailt, és fiókja biztonságban marad.

A jelszava visszaállításához látogasson el az alábbi linkre:
{{resetUrl}}

Ez a link {{expiryHours}} óráig érvényes.

BIZTONSÁGI TIPPEK
- Használjon erős, egyedi jelszót
- Legalább 8 karakter hosszú legyen
- Tartalmazzon kis- és nagybetűket, számokat
- Ne használja más weboldalakon

Technikai információk:
IP cím: {{ipAddress}}
Böngésző: {{userAgent}}
Időpont: {{requestTime}}

Ha bármilyen kérdése van, vagy segítségre van szüksége, írjon nekünk: {{supportEmail}}

Üdvözlettel,
A Hangjegyzet csapata
  `,
  variables: [
    {
      name: 'userName',
      description: 'Felhasználó neve',
      required: true
    },
    {
      name: 'resetUrl',
      description: 'Jelszó visszaállítási link',
      required: true
    },
    {
      name: 'expiryHours',
      description: 'Link érvényességi ideje órában',
      required: true,
      defaultValue: '24'
    },
    {
      name: 'ipAddress',
      description: 'Kérés IP címe',
      required: false
    },
    {
      name: 'userAgent',
      description: 'Böngésző információ',
      required: false
    },
    {
      name: 'requestTime',
      description: 'Kérés időpontja',
      required: true
    },
    {
      name: 'supportEmail',
      description: 'Support email cím',
      required: false,
      defaultValue: 'support@hangjegyzet.hu'
    }
  ],
  category: 'transactional',
  language: 'hu'
}