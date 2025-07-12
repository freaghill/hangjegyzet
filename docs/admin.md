# Admin Portal Documentation

## Overview

The HangJegyzet Admin Portal provides comprehensive tools for managing the platform, monitoring usage, and maintaining system health.

## Access Control

### Admin Authentication
- Admin access is controlled through environment variables and database roles
- Add admin emails to `ADMIN_EMAILS` environment variable (comma-separated)
- Users with `admin` or `owner` roles in the database also have admin access

### Setting Up Admin Access
```bash
# In .env.local
ADMIN_EMAILS=admin@example.com,superadmin@example.com
```

## Admin Portal Features

### 1. Dashboard (`/admin`)
- Real-time platform statistics
- Key metrics: users, organizations, meetings, subscriptions
- Monthly usage tracking
- Quick system health overview

### 2. User Management (`/admin/users`)
- View all registered users
- Search and filter by name or organization
- Role management (owner, admin, member)
- User activity monitoring
- Account enable/disable functionality

### 3. Organization Management (`/admin/organizations`)
- Manage all organizations
- Subscription tier control
- Usage monitoring per organization
- Billing data management
- Manual subscription adjustments

### 4. Analytics Dashboard (`/admin/analytics`)
- Monthly usage trends
- Meeting status distribution
- Subscription tier breakdown
- Top organizations by usage
- Platform growth metrics

### 5. Billing Management (`/admin/billing`)
- Invoice management
- Payment history
- Pending payment intents
- Revenue tracking
- Manual payment adjustments

### 6. System Health (`/admin/system`)
- Real-time health checks
- Database status
- Storage usage monitoring
- API usage statistics
- Processing queue management
- Failed meeting recovery

## API Endpoints

### Admin Users API
```
GET /api/admin/users
  - Params: page, limit, search, role
  - Returns: Paginated user list

PATCH /api/admin/users
  - Body: { userId, updates: { role, name } }
  - Updates user information
```

### Admin Organizations API
```
GET /api/admin/organizations
  - Params: page, limit, search, tier
  - Returns: Paginated organization list

PATCH /api/admin/organizations
  - Body: { organizationId, updates }
  - Updates organization settings
```

## Database Schema Updates

### Admin Role Support
```sql
-- Check if user is admin
SELECT is_admin(user_id);

-- Admin dashboard stats view
SELECT * FROM admin_dashboard_stats;
```

## Security Considerations

1. **Access Control**: All admin routes are protected by middleware and server-side checks
2. **Audit Logging**: Admin actions should be logged for compliance
3. **Rate Limiting**: Admin APIs have higher rate limits but are still protected
4. **Data Privacy**: Admins can view aggregated data but personal data access is limited

## Deployment

1. Set up admin email whitelist in environment variables
2. Run migration to add admin role support:
   ```bash
   supabase migration up
   ```
3. Grant admin access to initial users as needed
4. Monitor admin access logs regularly

## Best Practices

1. **Regular Monitoring**: Check system health daily
2. **User Support**: Use admin tools to help users with issues
3. **Billing Management**: Review pending payments weekly
4. **Performance**: Monitor processing queue during peak hours
5. **Security**: Regularly audit admin access logs

## Troubleshooting

### Common Issues

1. **Access Denied**: Verify user email is in ADMIN_EMAILS or has admin role
2. **Stats Not Loading**: Check database permissions for admin views
3. **Slow Performance**: Monitor database queries and add indexes if needed

### Support

For admin portal issues, contact the development team with:
- Error messages
- Screenshots
- Steps to reproduce
- Browser console logs