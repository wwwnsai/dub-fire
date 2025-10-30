-- Create email_subscriptions table
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  last_notified_at TIMESTAMP WITH TIME ZONE,
  notification_count INTEGER DEFAULT 0
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_email ON email_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_active ON email_subscriptions(is_active) WHERE is_active = TRUE;

-- Enable Row Level Security (RLS)
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts (for email registration)
CREATE POLICY "Allow public email registration" ON email_subscriptions
  FOR INSERT WITH CHECK (true);

-- Create policy to allow reading active subscriptions (for notification service)
CREATE POLICY "Allow reading active subscriptions" ON email_subscriptions
  FOR SELECT USING (is_active = TRUE);

-- Create a function to send email notifications (placeholder)
-- This would typically integrate with an email service like SendGrid, Resend, etc.
CREATE OR REPLACE FUNCTION send_fire_alert_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- This is a placeholder function
  -- In a real implementation, you would:
  -- 1. Query all active email subscriptions
  -- 2. Send emails using an email service
  -- 3. Update notification tracking
  
  -- For now, we'll just log the event
  RAISE LOG 'Fire alert triggered - would send notifications to all subscribers';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that fires when fire status changes
-- This would be triggered by your fire detection system
CREATE OR REPLACE FUNCTION trigger_fire_alert()
RETURNS void AS $$
BEGIN
  -- Update notification tracking for all active subscribers
  UPDATE email_subscriptions 
  SET 
    last_notified_at = NOW(),
    notification_count = notification_count + 1
  WHERE is_active = TRUE;
  
  -- Call the notification function
  PERFORM send_fire_alert_notification();
END;
$$ LANGUAGE plpgsql;
