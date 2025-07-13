import { EmailTemplate } from '../types'

export const emailVerificationTemplate: EmailTemplate = {
  id: 'email-verification',
  name: 'Email cím megerősítés',
  subject: 'Erősítse meg email címét - Hangjegyzet',
  htmlContent: `
    <h2>Kedves {{userName}}!</h2>
    
    <p>Köszönjük, hogy regisztrált a Hangjegyzetnél! Kérjük, erősítse meg email címét a fiókja aktiválásához.</p>
    
    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 18px;">📧 Email cím:</p>
      <p style="margin: 0; font-size: 20px; font-weight: bold;">{{userEmail}}</p>
    </div>
    
    <p>Az email cím megerősítéséhez kattintson az alábbi gombra:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verificationUrl}}" class="button" style="background-color: #10b981;">Email cím megerősítése</a>
    </div>
    
    <p style="text-align: center; color: #6b7280;">
      Vagy másolja be ezt a kódot a weboldalon: <strong style="font-size: 20px; color: #3b82f6;">{{verificationCode}}</strong>
    </p>
    
    <div class="divider"></div>
    
    <h3>❓ Miért fontos a megerősítés?</h3>
    <ul>
      <li>Biztosítja, hogy Ön a valódi tulajdonosa az email címnek</li>
      <li>Védelem a spam és visszaélések ellen</li>
      <li>Fontos értesítéseket küldhetünk Önnek</li>
      <li>Jelszó visszaállítás esetén szükséges</li>
    </ul>
    
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0;"><strong>💡 Tipp:</strong> A megerősítés után teljes hozzáférést kap minden funkcióhoz!</p>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Ez a link <strong>48 óráig</strong> érvényes. Ha lejárt, új megerősítő emailt kérhet a bejelentkezési oldalon.
    </p>
    
    <p>Ha nem Ön regisztrált ezzel az email címmel, kérjük hagyja figyelmen kívül ezt az üzenetet.</p>
    
    <p>Üdvözlettel,<br>
    A Hangjegyzet csapata</p>
  `,
  textContent: `
Kedves {{userName}}!

Köszönjük, hogy regisztrált a Hangjegyzetnél! Kérjük, erősítse meg email címét a fiókja aktiválásához.

Email cím: {{userEmail}}

Az email cím megerősítéséhez látogasson el az alábbi linkre:
{{verificationUrl}}

Vagy használja ezt a kódot: {{verificationCode}}

MIÉRT FONTOS A MEGERŐSÍTÉS?
- Biztosítja, hogy Ön a valódi tulajdonosa az email címnek
- Védelem a spam és visszaélések ellen
- Fontos értesítéseket küldhetünk Önnek
- Jelszó visszaállítás esetén szükséges

Tipp: A megerősítés után teljes hozzáférést kap minden funkcióhoz!

Ez a link 48 óráig érvényes. Ha lejárt, új megerősítő emailt kérhet a bejelentkezési oldalon.

Ha nem Ön regisztrált ezzel az email címmel, kérjük hagyja figyelmen kívül ezt az üzenetet.

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
      name: 'userEmail',
      description: 'Felhasználó email címe',
      required: true
    },
    {
      name: 'verificationUrl',
      description: 'Megerősítési link',
      required: true
    },
    {
      name: 'verificationCode',
      description: 'Megerősítési kód',
      required: true
    }
  ],
  category: 'transactional',
  language: 'hu'
}