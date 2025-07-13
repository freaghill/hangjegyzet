# Hangjegyzet API Documentation

This directory contains comprehensive API documentation for the Hangjegyzet meeting transcription platform.

## 📚 Documentation Files

### 1. OpenAPI Specification (`openapi.yaml`)
Complete OpenAPI 3.0.3 specification describing all API endpoints, request/response schemas, authentication, and examples.

**Key Features:**
- Full endpoint documentation with parameters and responses
- Schema definitions for all data models
- Authentication and security requirements
- Server configurations for different environments
- Comprehensive examples

**Usage:**
```bash
# View in Swagger UI
npx @apidevtools/swagger-cli serve openapi.yaml

# Validate the specification
npx @apidevtools/swagger-cli validate openapi.yaml

# Generate client code
npx @openapitools/openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ./client
```

### 2. Postman Collection (`postman-collection.json`)
Ready-to-use Postman collection with all API endpoints configured with examples and test scripts.

**Features:**
- Pre-configured requests for all endpoints
- Environment variables for easy configuration
- Example requests and responses
- Automated test scripts
- Pre-request scripts for authentication

**Import to Postman:**
1. Open Postman
2. Click "Import" → "File"
3. Select `postman-collection.json`
4. Configure environment variables:
   - `baseUrl`: API base URL (default: `https://hangjegyzet.hu/api`)
   - `access_token`: Your authentication token
   - `meeting_id`: Sample meeting ID for testing

## 🔑 Authentication

Most API endpoints require authentication using Supabase Auth. Include the bearer token in the Authorization header:

```http
Authorization: Bearer <access_token>
```

### Getting an Access Token

1. **Register a new user:**
   ```bash
   curl -X POST https://hangjegyzet.hu/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "user@example.com",
       "password": "securePassword123",
       "name": "Test User",
       "companyName": "Test Company"
     }'
   ```

2. **Login to get access token:**
   ```bash
   curl -X GET https://hangjegyzet.hu/api/auth/session \
     -H "Authorization: Bearer <token>"
   ```

## 🚀 Quick Start

### Using cURL

```bash
# Health check (no auth required)
curl https://hangjegyzet.hu/api/health

# Get meeting analytics
curl https://hangjegyzet.hu/api/ai/analytics?meetingId=<meeting_id> \
  -H "Authorization: Bearer <access_token>"

# Create subscription
curl -X POST https://hangjegyzet.hu/api/subscriptions/create \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "professional",
    "billingPeriod": "monthly"
  }'
```

### Using JavaScript/TypeScript

```typescript
// Using fetch
const response = await fetch('https://hangjegyzet.hu/api/meetings/search?q=quarterly', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();

// Using axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://hangjegyzet.hu/api',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { data } = await api.get('/meetings/search', {
  params: { q: 'quarterly' }
});
```

## 📋 API Categories

### 1. **Authentication** (`/auth/*`)
- User registration and login
- Session management
- OAuth callbacks

### 2. **Meetings** (`/meetings/*`)
- Meeting CRUD operations
- Transcription management
- Annotations and highlights
- Sharing and export
- AI-powered features

### 3. **AI Features** (`/ai/*`)
- Meeting analytics
- Predictions and insights
- Briefing generation
- Speaker identification

### 4. **Real-time** (`/realtime/*`)
- WebSocket connections
- Live transcription
- Real-time analytics
- Coaching and suggestions

### 5. **Integrations** (`/integrations/*`)
- Zoom integration
- Google Drive sync
- Calendar integration
- Microsoft Teams
- Slack
- MiniCRM

### 6. **Payments** (`/subscriptions/*`, `/billing/*`)
- Subscription management
- Payment processing
- Billing portal
- Webhooks

### 7. **Admin** (`/admin/*`)
- System monitoring
- User management
- Usage statistics
- Alert management

### 8. **Health** (`/health/*`)
- Health checks
- Liveness/readiness probes
- System metrics

## 🔄 Rate Limiting

API endpoints implement rate limiting:

| Endpoint Type | Rate Limit |
|--------------|------------|
| Standard endpoints | 100 requests/minute |
| AI endpoints | 20 requests/minute |
| Real-time endpoints | Connection-based |
| Admin endpoints | 50 requests/minute |

Rate limit headers:
- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset timestamp

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "code": "ERROR_CODE"
}
```

### Pagination
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "totalPages": 10,
    "totalRecords": 245,
    "limit": 25
  }
}
```

## 🔧 Development Tools

### Generate API Client

```bash
# TypeScript/Axios
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g typescript-axios \
  -o ./generated/client

# Python
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g python \
  -o ./generated/python-client

# Go
npx @openapitools/openapi-generator-cli generate \
  -i openapi.yaml \
  -g go \
  -o ./generated/go-client
```

### Mock Server

```bash
# Start mock server based on OpenAPI spec
npx @stoplight/prism-cli mock openapi.yaml -p 4010
```

### API Testing

```bash
# Run Newman tests with Postman collection
npx newman run postman-collection.json \
  --environment production.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

## 🌐 Environments

| Environment | Base URL | Description |
|------------|----------|-------------|
| Production | `https://hangjegyzet.hu/api` | Live production environment |
| Development | `https://dev.hangjegyzet.hu/api` | Development environment |
| Local | `http://localhost:3000/api` | Local development |

## 📞 Support

For API support and questions:
- Email: api-support@hangjegyzet.hu
- Documentation: https://hangjegyzet.hu/docs/api
- Status Page: https://status.hangjegyzet.hu

## 🔐 Security

- All API endpoints use HTTPS
- Authentication required for most endpoints
- Rate limiting implemented
- Input validation and sanitization
- CORS configured for allowed origins

## 📝 Changelog

### v1.0.0 (2024-01-08)
- Initial API documentation release
- Complete OpenAPI specification
- Postman collection with examples
- Comprehensive endpoint documentation