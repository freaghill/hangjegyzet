-- Add Stripe-specific fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription ON organizations(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Add Stripe fields to subscription_intents for tracking
ALTER TABLE subscription_intents
ADD COLUMN IF NOT EXISTS stripe_session_id VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_subscription_intents_stripe_session ON subscription_intents(stripe_session_id) WHERE stripe_session_id IS NOT NULL;