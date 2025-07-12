export interface ExportTemplate {
  id: string
  name: string
  description: string
  category: 'business' | 'legal' | 'medical' | 'education' | 'general'
  format: 'pdf' | 'docx' | 'html'
  template: string
  styles?: string
  isDefault: boolean
}

export const defaultTemplates: ExportTemplate[] = [
  {
    id: 'business-summary',
    name: 'Üzleti összefoglaló',
    description: 'Professzionális meeting összefoglaló vezetők számára',
    category: 'business',
    format: 'pdf',
    isDefault: true,
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{title}} - Összefoglaló</title>
  <style>{{{styles}}}</style>
</head>
<body>
  <div class="header">
    {{#if organization.logo}}
      <img src="{{organization.logo}}" alt="{{organization.name}}" class="logo">
    {{/if}}
    <div class="header-info">
      <h1>{{title}}</h1>
      <p class="subtitle">Meeting összefoglaló</p>
    </div>
  </div>

  <div class="metadata">
    <div class="meta-item">
      <strong>Dátum:</strong> {{formatDate created_at}}
    </div>
    <div class="meta-item">
      <strong>Időtartam:</strong> {{formatDuration duration_seconds}}
    </div>
    <div class="meta-item">
      <strong>Résztvevők:</strong> {{participants.length}} fő
    </div>
  </div>

  {{#if summary}}
  <section class="summary">
    <h2>Vezetői összefoglaló</h2>
    <p>{{summary}}</p>
  </section>
  {{/if}}

  {{#if key_points}}
  <section class="key-points">
    <h2>Főbb pontok</h2>
    <ul>
      {{#each key_points}}
        <li>{{this}}</li>
      {{/each}}
    </ul>
  </section>
  {{/if}}

  {{#if action_items}}
  <section class="action-items">
    <h2>Feladatok</h2>
    <table>
      <thead>
        <tr>
          <th>Feladat</th>
          <th>Felelős</th>
          <th>Határidő</th>
          <th>Prioritás</th>
        </tr>
      </thead>
      <tbody>
        {{#each action_items}}
        <tr>
          <td>{{text}}</td>
          <td>{{assignee.name}}</td>
          <td>{{formatDate due_date}}</td>
          <td><span class="priority-{{priority}}">{{translatePriority priority}}</span></td>
        </tr>
        {{/each}}
      </tbody>
    </table>
  </section>
  {{/if}}

  {{#if decisions}}
  <section class="decisions">
    <h2>Döntések</h2>
    <ul>
      {{#each decisions}}
        <li>{{this}}</li>
      {{/each}}
    </ul>
  </section>
  {{/if}}

  <div class="footer">
    <p>Készítette: HangJegyzet.AI • {{formatDate now}}</p>
  </div>
</body>
</html>
    `,
    styles: `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        display: flex;
        align-items: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e0e0e0;
      }
      .logo {
        max-height: 60px;
        margin-right: 20px;
      }
      h1 {
        margin: 0;
        color: #1a1a1a;
      }
      .subtitle {
        margin: 5px 0 0 0;
        color: #666;
      }
      .metadata {
        display: flex;
        gap: 30px;
        margin-bottom: 30px;
        padding: 15px;
        background: #f5f5f5;
        border-radius: 8px;
      }
      section {
        margin-bottom: 30px;
      }
      h2 {
        color: #2c3e50;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 10px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 15px;
      }
      th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
      }
      th {
        background: #f8f9fa;
        font-weight: 600;
      }
      .priority-high { color: #dc3545; font-weight: 600; }
      .priority-medium { color: #ffc107; }
      .priority-low { color: #6c757d; }
      .footer {
        margin-top: 50px;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
        text-align: center;
        color: #666;
        font-size: 0.9em;
      }
    `
  },
  {
    id: 'legal-protocol',
    name: 'Jogi jegyzőkönyv',
    description: 'Hivatalos jegyzőkönyv jogi megfelelőséggel',
    category: 'legal',
    format: 'docx',
    isDefault: true,
    template: `
# JEGYZŐKÖNYV

**Készült:** {{formatDate created_at 'yyyy. MMMM dd.'}}  
**Helyszín:** {{#if location}}{{location}}{{else}}Online meeting{{/if}}  
**Tárgy:** {{title}}

## Jelenlévők:
{{#each participants}}
- {{name}} ({{role}})
{{/each}}

## Napirendi pontok:
{{#each agenda_items}}
{{@index}}. {{this}}
{{/each}}

## Megbeszélés menete:

{{#each segments}}
### {{formatTime start_time}} - {{speaker}}
{{content}}

{{/each}}

## Határozatok:
{{#each decisions}}
**{{@index}}. számú határozat:**  
{{this}}
{{/each}}

## Feladatok:
{{#each action_items}}
- **{{text}}**  
  Felelős: {{assignee.name}}  
  Határidő: {{formatDate due_date}}
{{/each}}

## Mellékletek:
{{#each attachments}}
- {{name}}
{{/each}}

---

**Jegyzőkönyvet készítette:** {{created_by.name}}  
**Készítés időpontja:** {{formatDate now}}

### Aláírások:

_______________________  
Jegyzőkönyvvezető

_______________________  
Hitelesítő
    `
  },
  {
    id: 'medical-consultation',
    name: 'Egészségügyi konzultáció',
    description: 'Orvosi konzultáció dokumentálása GDPR megfelelőséggel',
    category: 'medical',
    format: 'pdf',
    isDefault: true,
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Konzultációs jegyzőkönyv</title>
  <style>{{{styles}}}</style>
</head>
<body>
  <div class="confidential-notice">
    <strong>BIZALMAS - EGÉSZSÉGÜGYI ADAT</strong>
  </div>

  <h1>Konzultációs jegyzőkönyv</h1>

  <div class="patient-info">
    <h2>Páciens adatai</h2>
    <p><strong>Azonosító:</strong> {{patient.id}}</p>
    <p><strong>Konzultáció dátuma:</strong> {{formatDate created_at}}</p>
  </div>

  <section>
    <h2>Konzultáció célja</h2>
    <p>{{description}}</p>
  </section>

  <section>
    <h2>Anamnézis</h2>
    {{#if anamnesis}}
      <p>{{anamnesis}}</p>
    {{/if}}
  </section>

  <section>
    <h2>Vizsgálati eredmények</h2>
    {{#if examination_results}}
      <ul>
      {{#each examination_results}}
        <li>{{this}}</li>
      {{/each}}
      </ul>
    {{/if}}
  </section>

  <section>
    <h2>Diagnózis</h2>
    {{#if diagnosis}}
      <p>{{diagnosis}}</p>
    {{/if}}
  </section>

  <section>
    <h2>Terápiás javaslat</h2>
    {{#if therapy_recommendations}}
      <ul>
      {{#each therapy_recommendations}}
        <li>{{this}}</li>
      {{/each}}
      </ul>
    {{/if}}
  </section>

  <section>
    <h2>Következő lépések</h2>
    {{#if next_steps}}
      <ul>
      {{#each next_steps}}
        <li>{{this}}</li>
      {{/each}}
      </ul>
    {{/if}}
  </section>

  <div class="signature-section">
    <p><strong>Kezelőorvos:</strong> {{doctor.name}}</p>
    <p><strong>Pecsétszám:</strong> {{doctor.stamp_number}}</p>
  </div>

  <div class="footer">
    <p>Ez a dokumentum szigorúan bizalmas egészségügyi adatokat tartalmaz.</p>
    <p>Készült: {{formatDate now}}</p>
  </div>
</body>
</html>
    `,
    styles: `
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        margin: 40px;
      }
      .confidential-notice {
        background: #dc3545;
        color: white;
        padding: 10px;
        text-align: center;
        margin-bottom: 20px;
      }
      h1, h2 {
        color: #2c3e50;
      }
      section {
        margin-bottom: 25px;
        padding: 15px;
        background: #f8f9fa;
        border-left: 3px solid #007bff;
      }
      .patient-info {
        background: #e9ecef;
        padding: 15px;
        margin-bottom: 20px;
      }
      .signature-section {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid #333;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        font-size: 0.9em;
        color: #666;
      }
    `
  },
  {
    id: 'education-notes',
    name: 'Oktatási jegyzet',
    description: 'Előadások és oktatási anyagok strukturált jegyzete',
    category: 'education',
    format: 'html',
    isDefault: true,
    template: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>{{title}} - Jegyzet</title>
  <style>{{{styles}}}</style>
</head>
<body>
  <div class="header">
    <h1>{{title}}</h1>
    <div class="meta">
      <span><strong>Előadó:</strong> {{presenter}}</span>
      <span><strong>Dátum:</strong> {{formatDate created_at}}</span>
      <span><strong>Időtartam:</strong> {{formatDuration duration_seconds}}</span>
    </div>
  </div>

  {{#if learning_objectives}}
  <section class="objectives">
    <h2>📚 Tanulási célok</h2>
    <ul>
      {{#each learning_objectives}}
        <li>{{this}}</li>
      {{/each}}
    </ul>
  </section>
  {{/if}}

  {{#if key_concepts}}
  <section class="concepts">
    <h2>💡 Kulcsfogalmak</h2>
    <div class="concept-grid">
      {{#each key_concepts}}
      <div class="concept-card">
        <h3>{{term}}</h3>
        <p>{{definition}}</p>
      </div>
      {{/each}}
    </div>
  </section>
  {{/if}}

  <section class="content">
    <h2>📝 Jegyzetek</h2>
    <div class="transcript-content">
      {{#each segments}}
      <div class="segment">
        <div class="timestamp">{{formatTime start_time}}</div>
        <div class="text">{{content}}</div>
      </div>
      {{/each}}
    </div>
  </section>

  {{#if questions}}
  <section class="questions">
    <h2>❓ Kérdések és válaszok</h2>
    {{#each questions}}
    <div class="qa-item">
      <div class="question">K: {{question}}</div>
      <div class="answer">V: {{answer}}</div>
    </div>
    {{/each}}
  </section>
  {{/if}}

  {{#if resources}}
  <section class="resources">
    <h2>📚 További források</h2>
    <ul>
      {{#each resources}}
        <li><a href="{{url}}">{{title}}</a> - {{description}}</li>
      {{/each}}
    </ul>
  </section>
  {{/if}}

  {{#if homework}}
  <section class="homework">
    <h2>📋 Házi feladat</h2>
    <ul>
      {{#each homework}}
        <li>{{this}}</li>
      {{/each}}
    </ul>
  </section>
  {{/if}}
</body>
</html>
    `,
    styles: `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        border-radius: 10px;
        margin-bottom: 30px;
      }
      .header h1 {
        margin: 0 0 15px 0;
      }
      .meta {
        display: flex;
        gap: 30px;
        font-size: 0.9em;
      }
      section {
        margin-bottom: 40px;
      }
      h2 {
        color: #2c3e50;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .concept-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
      }
      .concept-card {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid #667eea;
      }
      .concept-card h3 {
        margin-top: 0;
        color: #667eea;
      }
      .segment {
        display: flex;
        gap: 20px;
        margin-bottom: 15px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      .timestamp {
        font-weight: 600;
        color: #666;
        min-width: 60px;
      }
      .qa-item {
        margin-bottom: 20px;
        padding: 15px;
        background: #e9ecef;
        border-radius: 8px;
      }
      .question {
        font-weight: 600;
        margin-bottom: 10px;
      }
      .homework {
        background: #fff3cd;
        padding: 20px;
        border-radius: 8px;
        border-left: 4px solid #ffc107;
      }
    `
  }
]