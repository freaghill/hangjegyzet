# HangJegyzet.AI - Enterprise-Grade AI Meeting Intelligence Platform

## 🚨 CRITICAL: Library Usage Philosophy

**ALWAYS use existing open-source libraries when they match our needs.** We currently have significant duplication:
- 4 PDF libraries (should be 1-2)
- 3 email services (should be 1)
- 2 Redis clients (should be 1)
- Custom rate limiter (already have @upstash/ratelimit!)
- Custom cache manager (use existing solutions)

See `/docs/THIRD_PARTY_LIBRARIES.md` for details and cleanup instructions.

## 🎯 Mission Critical Architecture

**HangJegyzet.AI** - Building the most secure, reliable, and intelligent meeting platform in Europe. Enterprise-grade infrastructure with startup agility.

### Core Principles
```yaml
Security: "Zero-trust architecture, assume breach mentality"
Reliability: "99.99% uptime SLA, no exceptions"
Performance: "P95 latency <100ms globally"
Compliance: "GDPR, SOC2, ISO 27001, TISAX ready"
Intelligence: "AI that learns and improves continuously"
```

## 🔐 Security Architecture

### Zero-Trust Security Model
```typescript
// Every request is untrusted until proven otherwise
const securityLayers = {
  edge: {
    cdn: "Cloudflare Enterprise with WAF",
    ddos: "Advanced DDoS protection",
    rateLimit: "Adaptive rate limiting per user/IP",
    geoBlocking: "Configurable geographic restrictions"
  },
  
  network: {
    vpc: "Isolated VPCs per environment",
    privateSubnets: "No direct internet access for services",
    bastionHosts: "SSH access only through bastion",
    vpn: "WireGuard for admin access",
    serviceMode: "mTLS between all services"
  },
  
  application: {
    auth: "Auth0 Enterprise + custom RBAC",
    sessions: "Redis-backed secure sessions",
    tokens: "Short-lived JWTs (15min) + refresh tokens",
    mfa: "TOTP + WebAuthn mandatory for admins",
    apiKeys: "Scoped, rotatable, audited"
  },
  
  data: {
    encryption: {
      atRest: "AES-256-GCM with key rotation",
      inTransit: "TLS 1.3 only, no downgrades",
      fieldLevel: "Sensitive fields separately encrypted",
      keys: "AWS KMS / HashiCorp Vault"
    },
    access: {
      iam: "Principle of least privilege",
      audit: "Every data access logged",
      dlp: "Data loss prevention scanning",
      retention: "Automated GDPR-compliant deletion"
    }
  }
};
```

### Advanced Threat Protection
```python
# Real-time threat detection system
class ThreatDetectionEngine:
    def __init__(self):
        self.ml_models = {
            'anomaly': AnomalyDetectionModel(),
            'fraud': FraudDetectionModel(),
            'abuse': AbuseDetectionModel()
        }
        self.rules_engine = RulesEngine()
        self.threat_intel = ThreatIntelligenceFeed()
    
    async def analyze_request(self, request: Request) -> ThreatScore:
        # Parallel threat analysis
        checks = await asyncio.gather(
            self.check_ip_reputation(request.ip),
            self.analyze_behavior_pattern(request.user_id),
            self.detect_anomalies(request),
            self.check_rate_patterns(request),
            self.validate_session_integrity(request)
        )
        
        threat_score = self.calculate_threat_score(checks)
        
        if threat_score.is_high_risk:
            await self.trigger_incident_response(threat_score)
            
        return threat_score
```

### Compliance & Audit Framework
```yaml
compliance:
  gdpr:
    data_mapping: "Complete data flow documentation"
    privacy_by_design: "Built into every feature"
    dpia: "Data Protection Impact Assessments"
    consent: "Granular consent management"
    portability: "Full data export in 24h"
    deletion: "Complete removal in 30 days"
  
  soc2_type2:
    controls:
      - "Access control matrices"
      - "Change management procedures"
      - "Incident response plans"
      - "Business continuity planning"
      - "Vendor risk assessments"
    audit_trail:
      retention: "7 years"
      immutable: "Blockchain-backed logs"
      searchable: "Elasticsearch indexed"
  
  iso27001:
    isms: "Information Security Management System"
    risk_assessment: "Quarterly reviews"
    controls: "114 controls implemented"
    certification: "Annual external audit"
```

## 🏗️ Backend Excellence

### Microservices Architecture 2.0
```typescript
// Event-driven, loosely coupled services
const architecture = {
  orchestration: {
    platform: "Kubernetes 1.28+",
    serviceMode: "Istio service mesh",
    deployment: "GitOps with ArgoCD",
    scaling: "KEDA for event-driven scaling"
  },
  
  services: {
    // Core Services
    gateway: {
      tech: "Kong Gateway Enterprise",
      features: ["Rate limiting", "Auth", "Caching", "Analytics"]
    },
    
    auth: {
      tech: "Auth0 Enterprise + Custom RBAC",
      features: ["SSO", "SAML", "OAuth2", "WebAuthn"]
    },
    
    // Processing Services
    transcription: {
      tech: "Whisper on GPU nodes + custom models",
      scaling: "Horizontal with job queues",
      optimization: "Model quantization for speed"
    },
    
    intelligence: {
      tech: "Multi-model orchestration",
      models: ["Claude 3 Opus", "GPT-4", "Custom fine-tuned"],
      caching: "Embedding cache for similar queries"
    },
    
    // Data Services
    storage: {
      primary: "PostgreSQL 15 with Citus sharding",
      cache: "Redis Cluster with Sentinel",
      search: "Elasticsearch 8.x cluster",
      timeseries: "TimescaleDB for metrics",
      object: "MinIO for audio files"
    },
    
    // Supporting Services
    notifications: {
      tech: "NATS JetStream",
      delivery: ["Email", "Slack", "Teams", "Webhooks"]
    },
    
    billing: {
      tech: "Stripe + custom usage tracking",
      features: ["Metered billing", "Invoicing", "EU VAT"]
    }
  }
};
```

### Event-Driven Architecture
```python
# Robust event processing with CQRS
class EventProcessor:
    def __init__(self):
        self.event_store = EventStore()  # Apache Pulsar
        self.projections = ProjectionEngine()
        self.saga_manager = SagaOrchestrator()
        
    async def process_meeting_uploaded(self, event: MeetingUploadedEvent):
        # Start distributed transaction
        saga = await self.saga_manager.start_saga("ProcessMeeting", event)
        
        try:
            # Step 1: Validate and store
            await saga.run_step("validate_audio", 
                lambda: self.validate_audio(event.audio_url))
            
            # Step 2: Start parallel processing
            transcription_job, analysis_job = await saga.run_parallel([
                ("transcribe", lambda: self.start_transcription(event)),
                ("analyze_speakers", lambda: self.analyze_speakers(event))
            ])
            
            # Step 3: Intelligence processing
            insights = await saga.run_step("generate_insights",
                lambda: self.process_intelligence(transcription_job))
            
            # Step 4: Notifications
            await saga.run_step("notify",
                lambda: self.send_notifications(event.user_id, insights))
                
            await saga.complete()
            
        except Exception as e:
            # Automatic compensation
            await saga.compensate()
            raise
```

### Database Architecture
```sql
-- Sharded multi-tenant architecture
CREATE TABLE meetings (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    meeting_id UUID NOT NULL,
    
    -- Sharding key
    shard_key INT GENERATED ALWAYS AS (hashtext(tenant_id::text)) STORED,
    
    -- Encrypted fields
    transcript_encrypted BYTEA,
    encryption_key_id UUID,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Partitioning by month
    PRIMARY KEY (id, created_at),
    UNIQUE (tenant_id, meeting_id)
) PARTITION BY RANGE (created_at);

-- Automatic partition management
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    FOR i IN 0..12 LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
        end_date := start_date + '1 month'::interval;
        partition_name := 'meetings_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF meetings 
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## 📊 Advanced Monitoring & Observability

### Full-Stack Observability Platform
```typescript
const observability = {
  metrics: {
    platform: "Prometheus + Thanos for long-term storage",
    custom_metrics: {
      business: ["meetings_processed", "ai_accuracy", "user_satisfaction"],
      technical: ["api_latency_p99", "error_rate", "db_connections"],
      security: ["failed_auth_attempts", "suspicious_activities"]
    },
    dashboards: "Grafana with custom panels"
  },
  
  logs: {
    aggregation: "Fluentd/Fluentbit",
    storage: "Elasticsearch + S3 for archives",
    analysis: "Kibana + custom ML pipelines",
    retention: {
      hot: "7 days in Elasticsearch",
      warm: "30 days in S3 Infrequent Access",
      cold: "7 years in Glacier"
    }
  },
  
  traces: {
    platform: "Jaeger with Cassandra backend",
    instrumentation: "OpenTelemetry auto-instrumentation",
    sampling: "Adaptive sampling based on error rate",
    correlation: "Trace-to-log correlation"
  },
  
  synthetic: {
    monitoring: "Datadog Synthetics",
    locations: ["EU-West", "EU-Central", "US-East"],
    scenarios: [
      "Full user journey every 5 min",
      "API endpoint health every 1 min",
      "Critical path testing every 15 min"
    ]
  }
};
```

### Intelligent Alerting System
```python
# ML-powered alert correlation and suppression
class IntelligentAlertingSystem:
    def __init__(self):
        self.alert_rules = self.load_alert_rules()
        self.ml_correlator = AlertCorrelationML()
        self.incident_predictor = IncidentPredictionModel()
        
    async def process_metrics(self, metrics: MetricsBatch):
        # Anomaly detection
        anomalies = await self.detect_anomalies(metrics)
        
        # Predict potential incidents
        predictions = await self.incident_predictor.predict(
            current_metrics=metrics,
            historical_data=self.get_historical_context()
        )
        
        # Smart alert grouping
        alert_groups = self.ml_correlator.group_related_alerts(anomalies)
        
        # Severity calculation with business context
        for group in alert_groups:
            group.severity = self.calculate_business_impact(group)
            
            if group.severity.is_critical:
                await self.trigger_incident_response(group)
            elif group.severity.is_warning:
                await self.notify_on_call_engineer(group)
                
        # Suppress noise
        return self.apply_smart_suppression(alert_groups)
```

### Alert Escalation Matrix
```yaml
escalation_policies:
  critical:
    sla: "5 minutes"
    steps:
      - time: "0 min"
        action: "Page on-call engineer"
        channels: ["PagerDuty", "Slack #incidents"]
      - time: "5 min"
        action: "Page backup on-call + team lead"
        channels: ["PagerDuty", "Phone call"]
      - time: "15 min"
        action: "Page CTO + activate incident team"
        channels: ["All channels", "War room"]
    
  high:
    sla: "15 minutes"
    steps:
      - time: "0 min"
        action: "Notify on-call engineer"
        channels: ["Slack #alerts"]
      - time: "15 min"
        action: "Page on-call engineer"
        channels: ["PagerDuty"]
  
  medium:
    sla: "1 hour"
    action: "Create ticket for next business day"
    
alert_rules:
  - name: "API Error Rate High"
    query: "rate(http_requests_total{status=~'5..'}[5m]) > 0.05"
    severity: "critical"
    runbook: "https://runbooks.hangjegyzet.ai/api-errors"
    
  - name: "AI Processing Latency"
    query: "histogram_quantile(0.95, ai_processing_duration) > 30"
    severity: "high"
    business_impact: "Users waiting for transcripts"
```

## 🎛️ Enterprise Admin Portal

### Admin Dashboard Architecture
```typescript
// Separate admin app with enhanced security
const adminPortal = {
  auth: {
    separate_domain: "admin.hangjegyzet.ai",
    requirements: [
      "Corporate email only",
      "Hardware MFA mandatory",
      "IP allowlist",
      "Session recording"
    ]
  },
  
  features: {
    dashboard: {
      realtime: "WebSocket live metrics",
      customizable: "Drag-drop widget system",
      alerts: "Inline incident management"
    },
    
    userManagement: {
      search: "Elasticsearch-powered",
      bulkOps: "CSV import/export",
      impersonation: "With full audit trail",
      permissions: "Granular RBAC editor"
    },
    
    contentModeration: {
      queue: "ML-flagged content review",
      policies: "Custom rule engine",
      appeals: "User appeal workflow"
    },
    
    billing: {
      overview: "Revenue analytics",
      invoices: "Manual adjustments",
      usage: "Detailed usage reports",
      forecasting: "ML-based predictions"
    },
    
    system: {
      health: "Service dependency graph",
      deployment: "One-click rollback",
      features: "Feature flag management",
      experiments: "A/B test control"
    }
  }
};
```

### Admin UI Components
```tsx
// Premium admin interface with Ant Design Pro
const AdminLayout = () => {
  return (
    <ProLayout
      title="HangJegyzet Admin"
      layout="mix"
      navTheme="dark"
      primaryColor="#1890ff"
      contentWidth="Fluid"
      fixedHeader
      fixSiderbar
      menu={{
        request: async () => {
          // Dynamic menu based on permissions
          return getUserPermissions();
        },
      }}
      rightContentRender={() => <RightContent />}
      waterMarkProps={{
        content: 'HangJegyzet Admin',
      }}
    >
      <PageContainer>
        <ProCard>
          {/* Real-time metrics dashboard */}
          <MetricsDashboard />
        </ProCard>
      </PageContainer>
    </ProLayout>
  );
};

// Advanced data tables with virtual scrolling
const UserManagementTable = () => {
  return (
    <ProTable
      columns={columns}
      request={fetchUsers}
      rowKey="id"
      pagination={{
        pageSize: 50,
      }}
      scroll={{ y: 800 }}
      virtual
      search={{
        filterType: 'light',
      }}
      toolbar={{
        title: 'User Management',
        actions: [
          <Button key="export" icon={<ExportOutlined />}>
            Export
          </Button>,
          <Button key="import" icon={<ImportOutlined />}>
            Import
          </Button>,
        ],
      }}
    />
  );
};
```

### Admin API Security
```python
# Admin API with extra security layers
class AdminAPIMiddleware:
    def __init__(self):
        self.rate_limiter = AdminRateLimiter()
        self.audit_logger = AuditLogger()
        self.permission_checker = PermissionEngine()
        
    async def __call__(self, request: Request, call_next):
        # 1. Verify admin session
        if not await self.verify_admin_session(request):
            raise UnauthorizedException("Invalid admin session")
            
        # 2. Check IP allowlist
        if not self.is_ip_allowed(request.client.host):
            await self.audit_logger.log_suspicious_activity(request)
            raise ForbiddenException("IP not allowed")
            
        # 3. Verify permissions
        required_permission = self.get_required_permission(request.url.path)
        if not await self.permission_checker.has_permission(
            request.user, required_permission
        ):
            raise ForbiddenException(f"Missing permission: {required_permission}")
            
        # 4. Rate limiting (stricter for admin)
        if not await self.rate_limiter.check_admin_rate(request.user):
            raise TooManyRequestsException("Rate limit exceeded")
            
        # 5. Log all admin actions
        await self.audit_logger.log_admin_action(
            user=request.user,
            action=request.method,
            resource=request.url.path,
            details=await request.json() if request.method != "GET" else None
        )
        
        # 6. Add security headers
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
        
        return response
```

## 🚨 Incident Response & Disaster Recovery

### Incident Response Playbook
```yaml
incident_response:
  severity_levels:
    P0_critical:
      description: "Complete service outage"
      response_time: "< 5 minutes"
      team: ["On-call", "Team Lead", "CTO", "Customer Success"]
      
    P1_high:
      description: "Major feature broken"
      response_time: "< 15 minutes"
      team: ["On-call", "Team Lead"]
      
    P2_medium:
      description: "Minor feature issue"
      response_time: "< 1 hour"
      team: ["On-call"]
  
  runbooks:
    database_outage:
      steps:
        1: "Check replica status"
        2: "Attempt automatic failover"
        3: "If failed, manual failover"
        4: "Verify data consistency"
        5: "Update DNS if needed"
      automation: "95% automated"
      
    api_degradation:
      steps:
        1: "Identify affected endpoints"
        2: "Check upstream dependencies"
        3: "Enable circuit breakers"
        4: "Scale horizontally if needed"
        5: "Communicate status to users"
```

### Disaster Recovery Plan
```typescript
const disasterRecovery = {
  rto: "15 minutes", // Recovery Time Objective
  rpo: "5 minutes",  // Recovery Point Objective
  
  backups: {
    database: {
      frequency: "Continuous streaming replication",
      locations: ["Primary DC", "Secondary DC", "Cloud"],
      retention: "30 days point-in-time recovery",
      testing: "Monthly recovery drills"
    },
    
    files: {
      audio: "S3 cross-region replication",
      documents: "Versioned with 90-day retention"
    }
  },
  
  failover: {
    automatic: {
      database: "Patroni-managed PostgreSQL",
      services: "Kubernetes multi-region",
      dns: "Route53 health checks"
    },
    
    manual: {
      procedure: "Documented runbooks",
      authorization: "Two-person rule",
      communication: "Automated status page"
    }
  },
  
  testing: {
    chaos_engineering: "Weekly Chaos Monkey runs",
    disaster_simulation: "Quarterly full DR test",
    tabletop_exercises: "Monthly scenario planning"
  }
};
```

## 🔧 Development & Deployment Pipeline

### CI/CD Pipeline
```yaml
# GitLab CI/CD with security scanning
stages:
  - security
  - test
  - build
  - deploy

security:sast:
  stage: security
  script:
    - semgrep --config=auto
    - snyk test
    - trivy fs .
    - gitleaks detect

security:dependencies:
  stage: security
  script:
    - snyk test --all-projects
    - npm audit --production
    - safety check

test:unit:
  stage: test
  script:
    - npm run test:unit -- --coverage
    - npm run test:integration
  coverage: '/Coverage: \d+\.\d+%/'

test:e2e:
  stage: test
  services:
    - postgres:15
    - redis:7
  script:
    - npm run test:e2e

build:
  stage: build
  script:
    - docker build --build-arg VERSION=$CI_COMMIT_SHA .
    - docker scan image
    - docker push $REGISTRY/hangjegyzet:$CI_COMMIT_SHA

deploy:staging:
  stage: deploy
  script:
    - helm upgrade --install hangjegyzet ./charts/hangjegyzet
      --set image.tag=$CI_COMMIT_SHA
      --namespace staging
  environment:
    name: staging
    url: https://staging.hangjegyzet.ai

deploy:production:
  stage: deploy
  script:
    - helm upgrade --install hangjegyzet ./charts/hangjegyzet
      --set image.tag=$CI_COMMIT_SHA
      --namespace production
      --atomic
      --timeout 10m
  environment:
    name: production
    url: https://hangjegyzet.ai
  when: manual
  only:
    - main
```

### Infrastructure as Code
```hcl
# Terraform for Hetzner Cloud + AWS services
module "kubernetes_cluster" {
  source = "./modules/k8s-cluster"
  
  name     = "hangjegyzet-production"
  region   = "eu-central"
  version  = "1.28"
  
  node_pools = {
    system = {
      size  = "cpx31"  # 8 vCPU, 16GB RAM
      count = 3
      labels = {
        workload = "system"
      }
    }
    
    compute = {
      size  = "cpx51"  # 16 vCPU, 32GB RAM
      count = 5
      autoscale = {
        min = 5
        max = 20
      }
      labels = {
        workload = "compute"
      }
    }
    
    gpu = {
      size  = "gpu-rtx-4000"  # For AI workloads
      count = 2
      labels = {
        workload = "ai"
      }
      taints = [{
        key    = "nvidia.com/gpu"
        value  = "true"
        effect = "NoSchedule"
      }]
    }
  }
  
  addons = {
    cert_manager     = true
    external_dns     = true
    metrics_server   = true
    nvidia_plugin    = true
  }
}
```

## 📈 Business Intelligence & Analytics

### Custom Analytics Engine
```python
class BusinessIntelligenceEngine:
    def __init__(self):
        self.data_warehouse = Snowflake()
        self.ml_pipeline = MLPipeline()
        self.report_generator = ReportGenerator()
        
    async def generate_insights(self, tenant_id: str):
        # Real-time + historical analysis
        metrics = await gather(
            self.calculate_usage_metrics(tenant_id),
            self.analyze_meeting_patterns(tenant_id),
            self.predict_churn_risk(tenant_id),
            self.benchmark_against_industry(tenant_id)
        )
        
        insights = {
            "usage_trends": self.identify_trends(metrics.usage),
            "optimization_opportunities": self.find_optimizations(metrics),
            "roi_calculation": self.calculate_roi(metrics),
            "predictive_analytics": {
                "next_month_usage": metrics.predicted_usage,
                "churn_probability": metrics.churn_risk,
                "upsell_likelihood": metrics.upsell_score
            }
        }
        
        return insights
```

### Executive Dashboard
```typescript
// Real-time business metrics
const ExecutiveDashboard = {
  kpis: [
    {
      metric: "MRR",
      current: "€127,450",
      growth: "+23%",
      target: "€150,000",
      sparkline: true
    },
    {
      metric: "Customer Health",
      score: 87,
      breakdown: {
        active: "92%",
        satisfied: "88%",
        growing: "67%"
      }
    },
    {
      metric: "Platform Performance",
      uptime: "99.98%",
      avgLatency: "89ms",
      errorRate: "0.02%"
    }
  ],
  
  predictions: {
    revenueGrowth: "ML-based 90-day forecast",
    churnRisk: "Customers likely to cancel",
    expansionOpportunities: "Upsell candidates",
    operationalRisks: "Capacity planning alerts"
  }
};
```

## 🌍 Global Scalability Plan

### Multi-Region Architecture
```yaml
regions:
  primary:
    location: "EU-Central (Frankfurt)"
    services: "All services"
    data: "Primary database"
    
  secondary:
    location: "EU-West (Amsterdam)"
    services: "All services"
    data: "Read replica + failover"
    
  edge:
    locations:
      - "EU-North (Stockholm)"
      - "EU-South (Milan)"
      - "US-East (Virginia)"
      - "APAC (Singapore)"
    services:
      - "CDN endpoints"
      - "API gateway"
      - "Cached content"

data_sovereignty:
  eu_customers: "Data never leaves EU"
  us_customers: "US region (future)"
  encryption: "Per-region keys"
  compliance: "Local regulations"
```

This enterprise-grade architecture ensures HangJegyzet.AI is built for scale, security, and success from day one. Every component is designed with redundancy, monitoring, and growth in mind.