-- Email logs table for tracking all sent emails
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id VARCHAR(255),
  template VARCHAR(100) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  subject TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  variables JSONB,
  metadata JSONB,
  error TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  last_event VARCHAR(50),
  last_event_at TIMESTAMPTZ,
  events JSONB[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email logs
CREATE INDEX idx_email_logs_message_id ON email_logs(message_id);
CREATE INDEX idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX idx_email_logs_template ON email_logs(template);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at);

-- Email analytics table for tracking events
CREATE TABLE IF NOT EXISTS email_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  message_id VARCHAR(255),
  email VARCHAR(255),
  url TEXT,
  user_agent TEXT,
  ip_address INET,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email analytics
CREATE INDEX idx_email_analytics_event_type ON email_analytics(event_type);
CREATE INDEX idx_email_analytics_message_id ON email_analytics(message_id);
CREATE INDEX idx_email_analytics_email ON email_analytics(email);
CREATE INDEX idx_email_analytics_timestamp ON email_analytics(timestamp);

-- Email queue table for retry mechanism
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template VARCHAR(100) NOT NULL,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[],
  bcc_emails TEXT[],
  variables JSONB NOT NULL,
  metadata JSONB,
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  error TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for email queue
CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_priority ON email_queue(priority DESC);
CREATE INDEX idx_email_queue_next_retry_at ON email_queue(next_retry_at);
CREATE INDEX idx_email_queue_scheduled_at ON email_queue(scheduled_at);

-- Email templates usage tracking
CREATE TABLE IF NOT EXISTS email_template_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id VARCHAR(100) NOT NULL,
  language VARCHAR(10) NOT NULL,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  complained_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, language)
);

-- Function to update email template usage stats
CREATE OR REPLACE FUNCTION update_email_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update template usage stats based on email log changes
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != NEW.status) THEN
    INSERT INTO email_template_usage (template_id, language, sent_count, last_used_at)
    VALUES (NEW.template, 'hu', 1, NOW())
    ON CONFLICT (template_id, language) 
    DO UPDATE SET
      sent_count = email_template_usage.sent_count + 1,
      last_used_at = NOW(),
      updated_at = NOW();
    
    -- Update specific counters based on status
    IF NEW.status = 'delivered' THEN
      UPDATE email_template_usage 
      SET delivered_count = delivered_count + 1,
          updated_at = NOW()
      WHERE template_id = NEW.template AND language = 'hu';
    ELSIF NEW.status = 'bounced' THEN
      UPDATE email_template_usage 
      SET bounced_count = bounced_count + 1,
          updated_at = NOW()
      WHERE template_id = NEW.template AND language = 'hu';
    ELSIF NEW.status = 'complained' THEN
      UPDATE email_template_usage 
      SET complained_count = complained_count + 1,
          updated_at = NOW()
      WHERE template_id = NEW.template AND language = 'hu';
    END IF;
  END IF;
  
  -- Update opened/clicked counts from events
  IF TG_OP = 'UPDATE' AND NEW.opened_at IS NOT NULL AND OLD.opened_at IS NULL THEN
    UPDATE email_template_usage 
    SET opened_count = opened_count + 1,
        updated_at = NOW()
    WHERE template_id = NEW.template AND language = 'hu';
  END IF;
  
  IF TG_OP = 'UPDATE' AND NEW.clicked_at IS NOT NULL AND OLD.clicked_at IS NULL THEN
    UPDATE email_template_usage 
    SET clicked_count = clicked_count + 1,
        updated_at = NOW()
    WHERE template_id = NEW.template AND language = 'hu';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for email template usage
CREATE TRIGGER update_email_template_usage_trigger
AFTER INSERT OR UPDATE ON email_logs
FOR EACH ROW
EXECUTE FUNCTION update_email_template_usage();

-- Email suppression list (for unsubscribes, bounces, complaints)
CREATE TABLE IF NOT EXISTS email_suppressions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  reason VARCHAR(50) NOT NULL, -- 'unsubscribe', 'bounce', 'complaint'
  template VARCHAR(100), -- Specific template or NULL for all
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, reason, template)
);

-- Index for email suppressions
CREATE INDEX idx_email_suppressions_email ON email_suppressions(email);

-- Function to check if email is suppressed
CREATE OR REPLACE FUNCTION is_email_suppressed(
  check_email VARCHAR(255),
  check_template VARCHAR(100) DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_suppressions
    WHERE email = check_email
    AND (template IS NULL OR template = check_template)
  );
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;

-- Admin users can see all email data
CREATE POLICY "Admin users can view all email logs" ON email_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can view all email analytics" ON email_analytics
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can manage email queue" ON email_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can view template usage" ON email_template_usage
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin users can manage suppressions" ON email_suppressions
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Users can see their own email logs
CREATE POLICY "Users can view own email logs" ON email_logs
  FOR SELECT USING (to_email = auth.jwt() ->> 'email');