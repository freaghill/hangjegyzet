import { EmailTemplate } from '../types'

export const teamInvitationTemplate: EmailTemplate = {
  id: 'team-invitation',
  name: 'Csapat meghívó',
  subject: '{{inviterName}} meghívta Önt a(z) {{teamName}} csapatba',
  htmlContent: `
    <h2>Kedves {{inviteeName}}!</h2>
    
    <p><strong>{{inviterName}}</strong> meghívta Önt, hogy csatlakozzon a(z) <strong>{{teamName}}</strong> csapathoz a Hangjegyzetben.</p>
    
    <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
      <p style="margin: 0 0 10px 0; font-size: 18px;">Ön <strong>{{role}}</strong> szerepkörrel lett meghívva</p>
      <p style="margin: 0; color: #6b7280;">Ez a meghívó {{expiryDate}}-ig érvényes</p>
    </div>
    
    {{#if message}}
    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Üzenet {{inviterName}} részéről:</strong></p>
      <p style="margin: 10px 0 0 0; font-style: italic;">"{{message}}"</p>
    </div>
    {{/if}}
    
    <h3>👥 Mit jelent a csapattagság?</h3>
    <p>A(z) {{teamName}} csapat tagjaként:</p>
    <ul>
      <li>Hozzáférhet a csapat meetingjeihez és átírásaihoz</li>
      <li>Együttműködhet a többi csapattaggal</li>
      <li>Megoszthatja saját meetingjeit a csapattal</li>
      {{#if isAdmin}}
      <li>Adminisztrátorként kezelheti a csapat beállításait</li>
      <li>Új tagokat hívhat meg</li>
      {{/if}}
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{acceptUrl}}" class="button" style="background-color: #10b981;">Meghívás elfogadása</a>
    </div>
    
    <p style="text-align: center; color: #6b7280;">
      Ha nem szeretne csatlakozni, egyszerűen hagyja figyelmen kívül ezt az emailt.
    </p>
    
    {{#unless hasAccount}}
    <div class="divider"></div>
    
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px;">
      <p style="margin: 0;"><strong>📝 Még nincs Hangjegyzet fiókja?</strong></p>
      <p style="margin: 10px 0 0 0;">Nem probléma! A meghívó elfogadásával automatikusan létrehozunk Önnek egy fiókot.</p>
    </div>
    {{/unless}}
    
    <p>Üdvözlettel,<br>
    A Hangjegyzet csapata</p>
  `,
  textContent: `
Kedves {{inviteeName}}!

{{inviterName}} meghívta Önt, hogy csatlakozzon a(z) {{teamName}} csapathoz a Hangjegyzetben.

Ön {{role}} szerepkörrel lett meghívva.
Ez a meghívó {{expiryDate}}-ig érvényes.

{{#if message}}
Üzenet {{inviterName}} részéről:
"{{message}}"
{{/if}}

MIT JELENT A CSAPATTAGSÁG?
A(z) {{teamName}} csapat tagjaként:
- Hozzáférhet a csapat meetingjeihez és átírásaihoz
- Együttműködhet a többi csapattaggal
- Megoszthatja saját meetingjeit a csapattal
{{#if isAdmin}}
- Adminisztrátorként kezelheti a csapat beállításait
- Új tagokat hívhat meg
{{/if}}

Meghívás elfogadása: {{acceptUrl}}

Ha nem szeretne csatlakozni, egyszerűen hagyja figyelmen kívül ezt az emailt.

{{#unless hasAccount}}
MÉG NINCS HANGJEGYZET FIÓKJA?
Nem probléma! A meghívó elfogadásával automatikusan létrehozunk Önnek egy fiókot.
{{/unless}}

Üdvözlettel,
A Hangjegyzet csapata
  `,
  variables: [
    {
      name: 'inviteeName',
      description: 'Meghívott neve',
      required: true
    },
    {
      name: 'inviterName',
      description: 'Meghívó személy neve',
      required: true
    },
    {
      name: 'teamName',
      description: 'Csapat neve',
      required: true
    },
    {
      name: 'role',
      description: 'Szerepkör (tag/admin/tulajdonos)',
      required: true
    },
    {
      name: 'acceptUrl',
      description: 'Meghívó elfogadásának linkje',
      required: true
    },
    {
      name: 'expiryDate',
      description: 'Meghívó lejárati dátuma',
      required: true
    },
    {
      name: 'message',
      description: 'Személyes üzenet',
      required: false
    },
    {
      name: 'isAdmin',
      description: 'Admin szerepkör',
      required: false
    },
    {
      name: 'hasAccount',
      description: 'Van-e már fiókja',
      required: false
    }
  ],
  category: 'transactional',
  language: 'hu'
}

export default teamInvitationTemplate