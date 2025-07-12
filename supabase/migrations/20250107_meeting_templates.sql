-- Create meeting templates table
CREATE TABLE meeting_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    template_type VARCHAR(50) NOT NULL, -- standup, planning, retrospective, one_on_one, review, custom
    
    -- Template configuration
    sections JSONB NOT NULL DEFAULT '[]', -- Expected sections in the meeting
    prompts JSONB NOT NULL DEFAULT '{}', -- AI prompts for analysis
    fields JSONB DEFAULT '{}', -- Custom fields for the template
    
    -- Analysis configuration
    analysis_config JSONB DEFAULT '{
        "extractActionItems": true,
        "generateSummary": true,
        "identifySections": true,
        "trackMetrics": true,
        "customPrompts": []
    }',
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_templates_org (organization_id),
    INDEX idx_templates_type (template_type),
    INDEX idx_templates_slug (organization_id, slug),
    
    -- Constraints
    UNIQUE(organization_id, slug),
    CHECK (template_type IN ('standup', 'planning', 'retrospective', 'one_on_one', 'review', 'custom'))
);

-- Enable RLS
ALTER TABLE meeting_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates in their organization" ON meeting_templates
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ) OR is_default = true
    );

CREATE POLICY "Admins can create templates" ON meeting_templates
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can update templates" ON meeting_templates
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Admins can delete templates" ON meeting_templates
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Add template_id to meetings table
ALTER TABLE meetings 
ADD COLUMN template_id UUID REFERENCES meeting_templates(id),
ADD COLUMN template_data JSONB DEFAULT '{}'; -- Store template-specific data

-- Create index for template usage
CREATE INDEX idx_meetings_template ON meetings(template_id);

-- Function to insert default templates
CREATE OR REPLACE FUNCTION create_default_templates()
RETURNS void AS $$
BEGIN
    -- Standup template
    INSERT INTO meeting_templates (
        organization_id,
        name,
        slug,
        description,
        is_default,
        template_type,
        sections,
        prompts,
        analysis_config
    ) VALUES (
        NULL, -- Global template
        'Daily Standup',
        'daily-standup',
        'Quick daily sync meeting to discuss progress and blockers',
        true,
        'standup',
        '[
            {"name": "Yesterday", "description": "What was completed yesterday"},
            {"name": "Today", "description": "What will be worked on today"},
            {"name": "Blockers", "description": "Any impediments or blockers"}
        ]'::jsonb,
        '{
            "summary": "Summarize the key updates from each team member",
            "actionItems": "Extract any commitments made for today",
            "blockers": "Identify and highlight any blockers mentioned"
        }'::jsonb,
        '{
            "extractActionItems": true,
            "generateSummary": true,
            "identifySections": true,
            "trackMetrics": true,
            "customPrompts": [
                "Identify any dependencies between team members",
                "Flag any items that might need escalation"
            ]
        }'::jsonb
    );

    -- Planning template
    INSERT INTO meeting_templates (
        organization_id,
        name,
        slug,
        description,
        is_default,
        template_type,
        sections,
        prompts,
        analysis_config
    ) VALUES (
        NULL,
        'Sprint Planning',
        'sprint-planning',
        'Plan upcoming sprint work and commitments',
        true,
        'planning',
        '[
            {"name": "Sprint Goal", "description": "Overall objective for the sprint"},
            {"name": "Story Review", "description": "Review and estimate user stories"},
            {"name": "Capacity Planning", "description": "Team capacity and availability"},
            {"name": "Commitments", "description": "Final sprint commitments"}
        ]'::jsonb,
        '{
            "summary": "Summarize sprint goals and key commitments",
            "actionItems": "List all committed user stories with assignees",
            "risks": "Identify any risks or concerns raised during planning"
        }'::jsonb,
        '{
            "extractActionItems": true,
            "generateSummary": true,
            "identifySections": true,
            "trackMetrics": true,
            "customPrompts": [
                "Calculate total story points committed",
                "Identify dependencies on other teams"
            ]
        }'::jsonb
    );

    -- Retrospective template
    INSERT INTO meeting_templates (
        organization_id,
        name,
        slug,
        description,
        is_default,
        template_type,
        sections,
        prompts,
        analysis_config
    ) VALUES (
        NULL,
        'Sprint Retrospective',
        'sprint-retrospective',
        'Reflect on the past sprint and identify improvements',
        true,
        'retrospective',
        '[
            {"name": "What Went Well", "description": "Positive aspects to continue"},
            {"name": "What Could Be Improved", "description": "Areas for improvement"},
            {"name": "Action Items", "description": "Concrete actions to take"}
        ]'::jsonb,
        '{
            "summary": "Summarize key themes from the retrospective",
            "actionItems": "List all improvement actions with owners",
            "sentiment": "Analyze overall team sentiment and morale"
        }'::jsonb,
        '{
            "extractActionItems": true,
            "generateSummary": true,
            "identifySections": true,
            "trackMetrics": true,
            "customPrompts": [
                "Identify recurring themes from previous retrospectives",
                "Highlight any team dynamics or collaboration issues"
            ]
        }'::jsonb
    );

    -- 1-on-1 template
    INSERT INTO meeting_templates (
        organization_id,
        name,
        slug,
        description,
        is_default,
        template_type,
        sections,
        prompts,
        analysis_config
    ) VALUES (
        NULL,
        'One-on-One Meeting',
        'one-on-one',
        'Regular check-in between manager and team member',
        true,
        'one_on_one',
        '[
            {"name": "Check-in", "description": "General wellbeing and updates"},
            {"name": "Progress Review", "description": "Review of current work and goals"},
            {"name": "Feedback", "description": "Two-way feedback exchange"},
            {"name": "Career Development", "description": "Growth and development discussion"},
            {"name": "Action Items", "description": "Next steps and commitments"}
        ]'::jsonb,
        '{
            "summary": "Summarize key discussion points and outcomes",
            "actionItems": "List commitments from both parties",
            "development": "Highlight career development topics discussed"
        }'::jsonb,
        '{
            "extractActionItems": true,
            "generateSummary": true,
            "identifySections": true,
            "trackMetrics": false,
            "customPrompts": [
                "Identify any concerns or issues raised",
                "Note any recognition or positive feedback given"
            ]
        }'::jsonb
    );

    -- Review template
    INSERT INTO meeting_templates (
        organization_id,
        name,
        slug,
        description,
        is_default,
        template_type,
        sections,
        prompts,
        analysis_config
    ) VALUES (
        NULL,
        'Project Review',
        'project-review',
        'Review project status, risks, and next steps',
        true,
        'review',
        '[
            {"name": "Status Update", "description": "Current project status"},
            {"name": "Milestones", "description": "Progress on key milestones"},
            {"name": "Risks and Issues", "description": "Current risks and mitigation"},
            {"name": "Budget and Resources", "description": "Resource utilization"},
            {"name": "Next Steps", "description": "Upcoming activities"}
        ]'::jsonb,
        '{
            "summary": "Summarize project status and key decisions",
            "actionItems": "List all decisions and assigned actions",
            "risks": "Highlight all risks and their mitigation plans"
        }'::jsonb,
        '{
            "extractActionItems": true,
            "generateSummary": true,
            "identifySections": true,
            "trackMetrics": true,
            "customPrompts": [
                "Identify any schedule or budget concerns",
                "Flag items requiring escalation"
            ]
        }'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- Insert default templates
SELECT create_default_templates();

-- Function to copy default templates to new organizations
CREATE OR REPLACE FUNCTION copy_default_templates_to_organization(org_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO meeting_templates (
        organization_id,
        name,
        slug,
        description,
        is_default,
        template_type,
        sections,
        prompts,
        fields,
        analysis_config,
        created_at
    )
    SELECT 
        org_id,
        name,
        slug,
        description,
        false, -- Not default for org-specific copies
        template_type,
        sections,
        prompts,
        fields,
        analysis_config,
        NOW()
    FROM meeting_templates
    WHERE is_default = true AND organization_id IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Update handle_new_user function to copy templates
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
    
    -- Copy default templates to the new organization
    PERFORM copy_default_templates_to_organization(new_org_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for updated_at
CREATE TRIGGER update_meeting_templates_updated_at BEFORE UPDATE ON meeting_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();