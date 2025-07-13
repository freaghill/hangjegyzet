import { EmailTemplate } from '../types'

export const transcriptionCompleteTemplate: EmailTemplate = {
  id: 'transcription-complete',
  name: 'Átírás elkészült',
  subject: 'Elkészült a(z) "{{meetingTitle}}" meeting átírása',
  htmlContent: `
    <h2>Kedves {{userName}}!</h2>
    
    <p>Örömmel értesítjük, hogy elkészült a meeting átírása!</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">📋 Meeting részletei</h3>
      <table style="width: 100%; margin: 0;">
        <tr>
          <td style="padding: 8px 0;"><strong>Cím:</strong></td>
          <td style="padding: 8px 0;">{{meetingTitle}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Időtartam:</strong></td>
          <td style="padding: 8px 0;">{{duration}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Nyelv:</strong></td>
          <td style="padding: 8px 0;">{{language}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Átírás módja:</strong></td>
          <td style="padding: 8px 0;">{{transcriptionMode}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Feldolgozási idő:</strong></td>
          <td style="padding: 8px 0;">{{processingTime}}</td>
        </tr>
      </table>
    </div>
    
    {{#if summary}}
    <div class="divider"></div>
    
    <h3>📝 Összefoglaló</h3>
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0;">
      <p style="margin: 0;">{{summary}}</p>
    </div>
    {{/if}}
    
    {{#if keyPoints}}
    <h3>🎯 Főbb pontok</h3>
    <ul>
      {{#each keyPoints}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
    {{/if}}
    
    {{#if speakers}}
    <h3>👥 Résztvevők</h3>
    <p>A meetingen {{speakerCount}} beszélő vett részt:</p>
    <ul>
      {{#each speakers}}
      <li>{{this.name}} - {{this.duration}} beszédidő</li>
      {{/each}}
    </ul>
    {{/if}}
    
    <div class="divider"></div>
    
    <h3>🚀 Következő lépések</h3>
    <p>Most már:</p>
    <ul>
      <li>✏️ Szerkesztheti és formázhatja az átírást</li>
      <li>🔍 Kereshet konkrét témákra vagy kifejezésekre</li>
      <li>📤 Exportálhatja különböző formátumokban (PDF, DOCX, TXT)</li>
      <li>🔗 Megoszthatja csapattagjaival</li>
      <li>🏷️ Címkézheti a könnyebb rendszerezés érdekében</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{meetingUrl}}" class="button">Átírás megtekintése</a>
    </div>
    
    {{#if stats}}
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        <strong>Statisztika:</strong> {{wordCount}} szó | {{sentenceCount}} mondat | {{paragraphCount}} bekezdés
      </p>
    </div>
    {{/if}}
    
    <div class="divider"></div>
    
    <p style="color: #6b7280; font-size: 14px;">
      💡 <strong>Tipp:</strong> Az átírás pontosságát javíthatja, ha utólag átnézi és javítja az esetleges hibákat. 
      A rendszer folyamatosan tanul a javításokból!
    </p>
    
    <p>Üdvözlettel,<br>
    A Hangjegyzet csapata</p>
  `,
  textContent: `
Kedves {{userName}}!

Örömmel értesítjük, hogy elkészült a meeting átírása!

MEETING RÉSZLETEI
- Cím: {{meetingTitle}}
- Időtartam: {{duration}}
- Nyelv: {{language}}
- Átírás módja: {{transcriptionMode}}
- Feldolgozási idő: {{processingTime}}

{{#if summary}}
ÖSSZEFOGLALÓ
{{summary}}
{{/if}}

{{#if keyPoints}}
FŐBB PONTOK
{{#each keyPoints}}
- {{this}}
{{/each}}
{{/if}}

{{#if speakers}}
RÉSZTVEVŐK
A meetingen {{speakerCount}} beszélő vett részt:
{{#each speakers}}
- {{this.name}} - {{this.duration}} beszédidő
{{/each}}
{{/if}}

KÖVETKEZŐ LÉPÉSEK
Most már:
- Szerkesztheti és formázhatja az átírást
- Kereshet konkrét témákra vagy kifejezésekre
- Exportálhatja különböző formátumokban (PDF, DOCX, TXT)
- Megoszthatja csapattagjaival
- Címkézheti a könnyebb rendszerezés érdekében

Átírás megtekintése: {{meetingUrl}}

{{#if stats}}
Statisztika: {{wordCount}} szó | {{sentenceCount}} mondat | {{paragraphCount}} bekezdés
{{/if}}

Tipp: Az átírás pontosságát javíthatja, ha utólag átnézi és javítja az esetleges hibákat. 
A rendszer folyamatosan tanul a javításokból!

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
      name: 'meetingTitle',
      description: 'A meeting címe',
      required: true
    },
    {
      name: 'meetingUrl',
      description: 'Link a meeting oldalához',
      required: true
    },
    {
      name: 'duration',
      description: 'A meeting időtartama',
      required: true
    },
    {
      name: 'language',
      description: 'Az átírás nyelve',
      required: true,
      defaultValue: 'Magyar'
    },
    {
      name: 'transcriptionMode',
      description: 'Az átírás módja (Gyors/Kiegyensúlyozott/Precíz)',
      required: true
    },
    {
      name: 'processingTime',
      description: 'A feldolgozás időtartama',
      required: true
    },
    {
      name: 'summary',
      description: 'A meeting összefoglalója',
      required: false
    },
    {
      name: 'keyPoints',
      description: 'Főbb pontok listája',
      required: false
    },
    {
      name: 'speakers',
      description: 'Beszélők listája',
      required: false
    },
    {
      name: 'speakerCount',
      description: 'Beszélők száma',
      required: false
    },
    {
      name: 'wordCount',
      description: 'Szavak száma',
      required: false
    },
    {
      name: 'sentenceCount',
      description: 'Mondatok száma',
      required: false
    },
    {
      name: 'paragraphCount',
      description: 'Bekezdések száma',
      required: false
    }
  ],
  category: 'transactional',
  language: 'hu'
}