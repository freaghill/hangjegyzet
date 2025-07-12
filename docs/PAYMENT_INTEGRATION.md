# Payment Integration Documentation

## Overview

HangJegyzet.AI uses Hungarian payment providers optimized for the local market:
- **SimplePay** - Card payment processing
- **Billingo** - Invoice generation with Alanyi adómentes support

## SimplePay Integration

### Configuration
```bash
SIMPLEPAY_MERCHANT=your-merchant-id
SIMPLEPAY_SECRET_KEY=your-secret-key
SIMPLEPAY_SANDBOX=true  # Set to false for production
```

### Payment Flow
1. User selects subscription plan on `/settings/billing`
2. Fills billing information form
3. Redirected to SimplePay payment page
4. After payment, redirected back to one of:
   - `/api/payments/success` - Successful payment
   - `/api/payments/fail` - Failed payment
   - `/api/payments/cancel` - User cancelled
   - `/api/payments/timeout` - Payment timeout

### API Endpoints
- `POST /api/subscriptions/create` - Create subscription and initiate payment
- `GET /api/payments/success` - Handle successful payment callback
- `GET /api/payments/fail` - Handle failed payment callback
- `GET /api/payments/cancel` - Handle cancelled payment callback
- `GET /api/payments/timeout` - Handle timeout callback
- `POST /api/payments/ipn` - Handle server-to-server notifications

## Billingo Integration

### Configuration
```bash
BILLINGO_API_KEY=your-api-key
BILLINGO_BLOCK_ID=your-block-id
```

### Features
- Automatic invoice generation after successful payment
- Alanyi adómentes (AAM) tax designation
- Partner (customer) management
- PDF invoice generation and email delivery

### Invoice Details
- VAT: AAM (Alanyi adómentes - ÁFA tv. 193. §)
- Payment method: online_bankcard (SimplePay)
- Language: Hungarian
- Currency: HUF

## Subscription Plans

| Plan | Price (HUF) | Minutes/Month | Users | Storage |
|------|-------------|---------------|-------|---------|
| Trial | 0 | 500 | 3 | 30 days |
| Starter | 24,900 | 500 | 3 | 90 days |
| Professional | 74,900 | 2,000 | 10 | Unlimited |
| Enterprise | 224,900 | Unlimited | Unlimited | Unlimited |

All prices are Alanyi adómentes (no VAT).

## Database Schema

### subscription_intents
Tracks payment initiation and status:
- `order_ref` - Unique order reference
- `transaction_id` - SimplePay transaction ID
- `status` - pending/completed/failed/cancelled/timeout
- `billing_data` - Customer billing information

### invoices
Stores generated invoices:
- `invoice_number` - Billingo invoice number
- `metadata` - Contains billingo_id and billingo_partner_id
- All amounts stored without VAT

## Testing

1. Set up sandbox credentials in `.env.local`
2. Use test card numbers from SimplePay documentation
3. Monitor webhook responses in server logs
4. Check invoice generation in Billingo test environment

## Security Considerations

- All payment callbacks verify signature using HMAC-SHA384
- Subscription intents prevent duplicate payments
- Invoice generation is idempotent
- Failed invoice generation doesn't block subscription activation