import { EmailTemplate } from '../types'

export const paymentReceiptTemplate: EmailTemplate = {
  id: 'payment-receipt',
  name: 'Fizetési visszaigazolás',
  subject: 'Számla - {{invoiceNumber}} | Hangjegyzet',
  htmlContent: `
    <h2>Kedves {{userName}}!</h2>
    
    <p>Köszönjük a vásárlását! Az alábbiakban találja a tranzakció részleteit.</p>
    
    <div class="success">
      <p style="margin: 0;"><strong>✅ Sikeres fizetés!</strong> A tranzakció sikeresen feldolgozásra került.</p>
    </div>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">📄 Számla részletei</h3>
      <table style="width: 100%; margin: 0;">
        <tr>
          <td style="padding: 8px 0;"><strong>Számlaszám:</strong></td>
          <td style="padding: 8px 0;">{{invoiceNumber}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Dátum:</strong></td>
          <td style="padding: 8px 0;">{{invoiceDate}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0;"><strong>Fizetési mód:</strong></td>
          <td style="padding: 8px 0;">{{paymentMethod}}</td>
        </tr>
        {{#if transactionId}}
        <tr>
          <td style="padding: 8px 0;"><strong>Tranzakció azonosító:</strong></td>
          <td style="padding: 8px 0;">{{transactionId}}</td>
        </tr>
        {{/if}}
      </table>
    </div>
    
    <h3>🛒 Tételek</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 12px; background-color: #f3f4f6;">Megnevezés</th>
          <th style="text-align: center; padding: 12px; background-color: #f3f4f6;">Mennyiség</th>
          <th style="text-align: right; padding: 12px; background-color: #f3f4f6;">Egységár</th>
          <th style="text-align: right; padding: 12px; background-color: #f3f4f6;">Összesen</th>
        </tr>
      </thead>
      <tbody>
        {{#each items}}
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">{{this.name}}</td>
          <td style="padding: 12px; text-align: center; border-bottom: 1px solid #e5e7eb;">{{this.quantity}}</td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">{{this.unitPrice}} Ft</td>
          <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">{{this.total}} Ft</td>
        </tr>
        {{/each}}
      </tbody>
      <tfoot>
        {{#if discount}}
        <tr>
          <td colspan="3" style="padding: 8px 12px; text-align: right;">Kedvezmény:</td>
          <td style="padding: 8px 12px; text-align: right; color: #059669;">-{{discount}} Ft</td>
        </tr>
        {{/if}}
        <tr>
          <td colspan="3" style="padding: 8px 12px; text-align: right;"><strong>Nettó összeg:</strong></td>
          <td style="padding: 8px 12px; text-align: right;">{{netAmount}} Ft</td>
        </tr>
        <tr>
          <td colspan="3" style="padding: 8px 12px; text-align: right;">ÁFA ({{vatRate}}%):</td>
          <td style="padding: 8px 12px; text-align: right;">{{vatAmount}} Ft</td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td colspan="3" style="padding: 12px; text-align: right;"><strong>Fizetendő összeg:</strong></td>
          <td style="padding: 12px; text-align: right; font-size: 18px;"><strong>{{totalAmount}} Ft</strong></td>
        </tr>
      </tfoot>
    </table>
    
    {{#if billingAddress}}
    <div class="divider"></div>
    
    <h3>📮 Számlázási adatok</h3>
    <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
      <p style="margin: 5px 0;"><strong>{{billingAddress.name}}</strong></p>
      {{#if billingAddress.taxNumber}}
      <p style="margin: 5px 0;">Adószám: {{billingAddress.taxNumber}}</p>
      {{/if}}
      <p style="margin: 5px 0;">{{billingAddress.address}}</p>
      <p style="margin: 5px 0;">{{billingAddress.city}}, {{billingAddress.postalCode}}</p>
      <p style="margin: 5px 0;">{{billingAddress.country}}</p>
    </div>
    {{/if}}
    
    {{#if subscription}}
    <div class="divider"></div>
    
    <h3>🔄 Előfizetés részletei</h3>
    <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px;">
      <p style="margin: 5px 0;"><strong>Csomag:</strong> {{subscription.planName}}</p>
      <p style="margin: 5px 0;"><strong>Időszak:</strong> {{subscription.period}}</p>
      <p style="margin: 5px 0;"><strong>Következő számlázás:</strong> {{subscription.nextBillingDate}}</p>
      {{#if subscription.features}}
      <p style="margin: 10px 0 5px 0;"><strong>A csomag tartalma:</strong></p>
      <ul style="margin: 5px 0;">
        {{#each subscription.features}}
        <li>{{this}}</li>
        {{/each}}
      </ul>
      {{/if}}
    </div>
    {{/if}}
    
    <div class="divider"></div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{invoiceUrl}}" class="button">Számla letöltése PDF-ben</a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px;">
      Ez a számla az ÁFA törvény szerint elektronikus számlaként került kiállításra és kézbesítésre.
      A számla megfelel a hatályos jogszabályi előírásoknak.
    </p>
    
    <p style="color: #6b7280; font-size: 14px;">
      Ha bármilyen kérdése van a számlával kapcsolatban, kérjük vegye fel velünk a kapcsolatot:
      <a href="mailto:{{billingEmail}}">{{billingEmail}}</a>
    </p>
    
    <p>Üdvözlettel,<br>
    A Hangjegyzet csapata</p>
  `,
  textContent: `
Kedves {{userName}}!

Köszönjük a vásárlását! Az alábbiakban találja a tranzakció részleteit.

✅ SIKERES FIZETÉS!
A tranzakció sikeresen feldolgozásra került.

SZÁMLA RÉSZLETEI
- Számlaszám: {{invoiceNumber}}
- Dátum: {{invoiceDate}}
- Fizetési mód: {{paymentMethod}}
{{#if transactionId}}- Tranzakció azonosító: {{transactionId}}{{/if}}

TÉTELEK
{{#each items}}
- {{this.name}} | {{this.quantity}} db | {{this.unitPrice}} Ft/db | Összesen: {{this.total}} Ft
{{/each}}

{{#if discount}}Kedvezmény: -{{discount}} Ft{{/if}}
Nettó összeg: {{netAmount}} Ft
ÁFA ({{vatRate}}%): {{vatAmount}} Ft
----------------------------------------
FIZETENDŐ ÖSSZEG: {{totalAmount}} Ft

{{#if billingAddress}}
SZÁMLÁZÁSI ADATOK
{{billingAddress.name}}
{{#if billingAddress.taxNumber}}Adószám: {{billingAddress.taxNumber}}{{/if}}
{{billingAddress.address}}
{{billingAddress.city}}, {{billingAddress.postalCode}}
{{billingAddress.country}}
{{/if}}

{{#if subscription}}
ELŐFIZETÉS RÉSZLETEI
Csomag: {{subscription.planName}}
Időszak: {{subscription.period}}
Következő számlázás: {{subscription.nextBillingDate}}
{{#if subscription.features}}
A csomag tartalma:
{{#each subscription.features}}
- {{this}}
{{/each}}
{{/if}}
{{/if}}

Számla letöltése PDF-ben: {{invoiceUrl}}

Ez a számla az ÁFA törvény szerint elektronikus számlaként került kiállításra és kézbesítésre.
A számla megfelel a hatályos jogszabályi előírásoknak.

Ha bármilyen kérdése van a számlával kapcsolatban, kérjük vegye fel velünk a kapcsolatot:
{{billingEmail}}

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
      name: 'invoiceNumber',
      description: 'Számla száma',
      required: true
    },
    {
      name: 'invoiceDate',
      description: 'Számla dátuma',
      required: true
    },
    {
      name: 'invoiceUrl',
      description: 'Link a PDF számlához',
      required: true
    },
    {
      name: 'paymentMethod',
      description: 'Fizetési mód',
      required: true
    },
    {
      name: 'transactionId',
      description: 'Tranzakció azonosító',
      required: false
    },
    {
      name: 'items',
      description: 'Számla tételei',
      required: true
    },
    {
      name: 'discount',
      description: 'Kedvezmény összege',
      required: false
    },
    {
      name: 'netAmount',
      description: 'Nettó összeg',
      required: true
    },
    {
      name: 'vatRate',
      description: 'ÁFA kulcs',
      required: true,
      defaultValue: '27'
    },
    {
      name: 'vatAmount',
      description: 'ÁFA összege',
      required: true
    },
    {
      name: 'totalAmount',
      description: 'Bruttó összeg',
      required: true
    },
    {
      name: 'billingAddress',
      description: 'Számlázási cím',
      required: false
    },
    {
      name: 'subscription',
      description: 'Előfizetés adatai',
      required: false
    },
    {
      name: 'billingEmail',
      description: 'Számlázási email',
      required: false,
      defaultValue: 'szamla@hangjegyzet.hu'
    }
  ],
  category: 'transactional',
  language: 'hu'
}