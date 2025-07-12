-- Create custom types
CREATE TYPE subscription_tier AS ENUM ('trial', 'starter', 'professional', 'enterprise');
CREATE TYPE meeting_status AS ENUM ('uploading', 'processing', 'completed', 'failed');
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'member');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    subscription_tier subscription_tier DEFAULT 'trial',
    subscription_ends_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies for organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users profile extension
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255),
    role user_role DEFAULT 'member',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Meetings table
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255),
    file_url TEXT,
    duration_seconds INTEGER,
    status meeting_status DEFAULT 'uploading',
    transcript JSONB,
    summary TEXT,
    action_items JSONB DEFAULT '[]',
    intelligence_score FLOAT,
    speakers JSONB DEFAULT '[]',
    language VARCHAR(10) DEFAULT 'hu',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for meetings table
CREATE INDEX idx_meetings_org ON meetings(organization_id);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_created ON meetings(created_at DESC);

-- Create RLS policies for meetings
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Usage tracking
CREATE TABLE usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    minutes_used INTEGER DEFAULT 0,
    meetings_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(organization_id, month)
);

-- Create RLS policies for usage_stats
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- Create organization for new user
    INSERT INTO organizations (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 1)),
        gen_random_uuid()::text
    )
    RETURNING id INTO new_org_id;
    
    -- Create profile
    INSERT INTO profiles (id, organization_id, name, role)
    VALUES (
        NEW.id,
        new_org_id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'owner'
    );
    
    -- Note: Vocabulary initialization will be handled by the application
    -- when the user first accesses the vocabulary settings
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Owners can update their organization" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Meetings policies
CREATE POLICY "Users can view meetings in their organization" ON meetings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create meetings in their organization" ON meetings
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update meetings in their organization" ON meetings
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own meetings" ON meetings
    FOR DELETE USING (
        created_by = auth.uid()
    );

-- Usage stats policies
CREATE POLICY "Users can view their organization's usage" ON usage_stats
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Function to increment usage stats
CREATE OR REPLACE FUNCTION increment_usage(
    org_id UUID,
    month DATE,
    minutes INTEGER
)
RETURNS void AS $$
BEGIN
    INSERT INTO usage_stats (organization_id, month, minutes_used, meetings_count)
    VALUES (org_id, month, minutes, 1)
    ON CONFLICT (organization_id, month)
    DO UPDATE SET
        minutes_used = usage_stats.minutes_used + EXCLUDED.minutes_used,
        meetings_count = usage_stats.meetings_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for meetings
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meetings', 'meetings', false) 
ON CONFLICT DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload to their organization's folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'meetings' AND
        (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'meetings' AND
        (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own uploads" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'meetings' AND
        owner = auth.uid()
    );

-- Subscription intents table
CREATE TABLE subscription_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL,
    order_ref VARCHAR(100) UNIQUE NOT NULL,
    transaction_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    amount INTEGER NOT NULL,
    billing_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create indexes for subscription_intents
CREATE INDEX idx_intents_order_ref ON subscription_intents(order_ref);
CREATE INDEX idx_intents_transaction ON subscription_intents(transaction_id);

-- Invoices table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    net_amount INTEGER NOT NULL,
    vat_rate INTEGER NOT NULL,
    vat_amount INTEGER NOT NULL,
    gross_amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    status VARCHAR(50) DEFAULT 'draft',
    billing_data JSONB NOT NULL,
    items JSONB NOT NULL,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for invoices
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_year ON invoices(year);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Payment history
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id),
    amount INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'HUF',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    status VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for payment_history
CREATE INDEX idx_payments_org ON payment_history(organization_id);
CREATE INDEX idx_payments_transaction ON payment_history(transaction_id);

-- Add billing data to organizations
ALTER TABLE organizations 
ADD COLUMN billing_data JSONB DEFAULT '{}';

-- RLS Policies for payment tables
ALTER TABLE subscription_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Subscription intents policies
CREATE POLICY "Organizations can view their intents" ON subscription_intents
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Invoices policies  
CREATE POLICY "Organizations can view their invoices" ON invoices
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Payment history policies
CREATE POLICY "Organizations can view their payments" ON payment_history
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );