# Email Notification System Setup

This document explains how to set up the email notification system for fire alerts.

## Features Implemented

1. **Email Registration Page** (`/email`) - Users can register their email for fire alerts
2. **Supabase Integration** - Stores email subscriptions in database
3. **Fire Alert API** - Triggers email notifications when fire is detected
4. **Updated Navigation** - Replaced history icon with email icon
5. **Test Interface** - Admin panel to test fire alert system

## Database Setup

### 1. Run the Supabase Migration

Execute the SQL migration file in your Supabase dashboard:

```sql
-- Run the contents of supabase-migration.sql in your Supabase SQL editor
```

This creates:
- `email_subscriptions` table
- Proper indexes for performance
- Row Level Security policies
- Notification tracking functions

### 2. Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How It Works

### Email Registration Flow

1. User visits `/email` page
2. Enters their email address
3. Email is stored in Supabase `email_subscriptions` table
4. User receives confirmation message

### Fire Alert Flow

1. Fire detection system calls `/api/fire-alert` endpoint
2. System fetches all active email subscriptions
3. Notifications are sent to all subscribers
4. Database tracks notification history

### API Endpoints

#### POST `/api/fire-alert`
Triggers fire alert notifications.

**Request Body:**
```json
{
  "status": "fire",
  "location": "Dubai Fire Station",
  "severity": "high",
  "coordinates": {
    "lat": 25.2048,
    "lng": 55.2708
  }
}
```

#### GET `/api/fire-alert`
Returns notification statistics.

**Response:**
```json
{
  "totalSubscribers": 10,
  "activeSubscribers": 8,
  "lastNotificationSent": "2024-01-15T10:30:00Z"
}
```

## Email Service Integration

The current implementation includes placeholder functions for email sending. To enable actual email notifications, integrate with an email service:

### Option 1: Resend (Recommended)

1. Install Resend:
```bash
npm install resend
```

2. Add to `.env.local`:
```env
RESEND_API_KEY=your_resend_api_key
```

3. Update `lib/emailService.ts` to use Resend API

### Option 2: SendGrid

1. Install SendGrid:
```bash
npm install @sendgrid/mail
```

2. Add to `.env.local`:
```env
SENDGRID_API_KEY=your_sendgrid_api_key
```

3. Update `lib/emailService.ts` to use SendGrid API

## Testing

1. Start the development server:
```bash
npm run dev
```

2. Visit `/email` to register test emails
3. Visit the home page to test fire alerts
4. Check browser console for detailed logs

## Database Schema

### email_subscriptions table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | User email (unique) |
| created_at | TIMESTAMP | Registration timestamp |
| is_active | BOOLEAN | Subscription status |
| last_notified_at | TIMESTAMP | Last notification sent |
| notification_count | INTEGER | Total notifications sent |

## Security Considerations

1. **Row Level Security** - Enabled on email_subscriptions table
2. **Input Validation** - Email format validation
3. **Rate Limiting** - Consider adding rate limiting to API endpoints
4. **Unsubscribe** - Implement unsubscribe functionality
5. **Email Verification** - Consider adding email verification

## Next Steps

1. Integrate with actual email service
2. Add email templates for notifications
3. Implement unsubscribe functionality
4. Add email verification
5. Set up monitoring and logging
6. Add admin dashboard for managing subscriptions
