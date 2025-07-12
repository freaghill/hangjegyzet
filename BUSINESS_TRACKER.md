# 📊 HangJegyzet Business Tracker

## 🎯 Current Focus: SHIP IT!

**Status**: Pre-launch  
**Days to Launch**: 30  
**Monthly Burn Rate**: €119 (Hetzner + APIs)  
**Runway**: Bootstrapped

---

## 💰 Financial Reality Check

### Cost Structure (Per 100 Users)
```
Fixed Costs:
- Hetzner Server: €39/month (includes PostgreSQL)
- Domain/Email: €10/month
- Misc Tools: €5/month
Total Fixed: €54/month

Database Decision: Self-hosted PostgreSQL (€0 additional)
- Saves €200-300/year vs managed options
- Switch to managed when >1000 users

Variable Costs:
- Whisper API: €0.30/user
- Claude API: €0.30/user
- Embeddings: €0.05/user
Total Variable: €0.65/user

Break-even: 6 users @ Indulo price
```

### Revenue Projections

#### Conservative (Year 1)
| Month | Users | MRR (€) | Costs (€) | Profit (€) |
|-------|-------|---------|-----------|------------|
| 1     | 10    | 250     | 60        | 190        |
| 3     | 50    | 1,250   | 86        | 1,164      |
| 6     | 150   | 5,000   | 151       | 4,849      |
| 12    | 300   | 12,000  | 249       | 11,751     |

**Year 1 Total**: €75,000 revenue, €73,000 profit

#### Realistic (Year 1)
| Month | Users | MRR (€) | Profit (€) |
|-------|-------|---------|------------|
| 1     | 30    | 750     | 670        |
| 3     | 100   | 3,000   | 2,885      |
| 6     | 250   | 10,000  | 9,838      |
| 12    | 500   | 25,000  | 24,675     |

**Year 1 Total**: €150,000 revenue, €147,000 profit

---

## 📈 Key Metrics to Track

### Launch Metrics (First 30 Days)
- [ ] Signups: ___/50 target
- [ ] Paying customers: ___/10 target  
- [ ] Churn rate: ___%
- [ ] Support tickets: ___
- [ ] Uptime: ___%
- [ ] Average response time: ___ms

### Growth Metrics (Monthly)
- Customer Acquisition Cost (CAC): €___
- Lifetime Value (LTV): €___
- Monthly Recurring Revenue (MRR): €___
- Gross Margin: ___%
- Net Promoter Score (NPS): ___

### Usage Metrics
```sql
-- Track these weekly
SELECT COUNT(DISTINCT user_id) as weekly_active_users FROM meetings WHERE created_at > NOW() - INTERVAL '7 days';
SELECT AVG(duration_seconds/60) as avg_meeting_length FROM meetings;
SELECT COUNT(*) as meetings_per_user FROM meetings GROUP BY user_id;
```

---

## 🎯 Sales Pipeline

### Target Customer Profile
**Sweet Spot**: Hungarian SMBs with 20-100 employees
- Regular client meetings
- Compliance requirements
- Budget: €30-100/month for tools

### Outreach Strategy
1. **Week 1-2**: Friends & Network (10 customers)
2. **Week 3-4**: LinkedIn Outreach (30 customers)
3. **Month 2**: Cold Email Campaign (50 customers)
4. **Month 3**: Partnerships (100 customers)

### Sales Process
```
1. Demo Request → Schedule within 24h
2. 30-min Demo → Focus on outcomes, not features
3. Free Trial → 14 days, full features
4. Follow-up → Day 3, 7, 13
5. Close → Offer 20% discount for annual
```

---

## 📋 Weekly Business Tasks

### Monday: Numbers Day
- [ ] Update MRR tracker
- [ ] Review usage metrics
- [ ] Calculate burn rate
- [ ] Check payment failures

### Tuesday: Product Day  
- [ ] Review support tickets
- [ ] Prioritize bug fixes
- [ ] Test core flows
- [ ] Deploy fixes

### Wednesday: Sales Day
- [ ] Send 10 LinkedIn messages
- [ ] Follow up with trials
- [ ] Schedule demos
- [ ] Update CRM

### Thursday: Marketing Day
- [ ] Write blog post
- [ ] Post on LinkedIn
- [ ] Update website
- [ ] Engage in forums

### Friday: Strategy Day
- [ ] Review weekly metrics
- [ ] Plan next week
- [ ] Talk to customers
- [ ] Competitive research

---

## 🚨 Risk Management

### Biggest Risks
1. **Competition from Big Tech** 
   - Mitigation: Focus on Hungarian language excellence
   
2. **AI API Cost Explosion**
   - Mitigation: Aggressive caching, usage limits

3. **Single Point of Failure (You)**
   - Mitigation: Document everything, automate ops

4. **Currency Risk (HUF/EUR)**
   - Mitigation: Price in EUR for enterprise

### Kill Switches
- API rate limiting per user
- Automatic suspension for abuse
- Cost alerts at €200, €500, €1000
- Backup payment processor

---

## 📊 Pricing Strategy

### Current Tiers
1. **Indulo** (€25/mo) - 500 fast, 100 balanced
2. **Profi** (€75/mo) - 2000 fast, 500 balanced, 50 precision  
3. **Vallalati** (€225/mo) - 10000 fast, 2000 balanced, 200 precision

### Upsell Opportunities
- Extra minutes: €0.10/minute
- Priority support: +€50/month
- API access: +€100/month
- White label: +€500/month

---

## 💡 Growth Hacks

### Quick Wins
1. **Partner with Hungarian VA agencies** - They need transcription
2. **Offer lifetime deals** - €500 for early supporters  
3. **Government grant applications** - Many available for AI startups
4. **Free for universities** - Get testimonials

### Content Marketing
- "How to reduce meeting time by 50%"
- "GDPR compliance for recorded meetings"
- "Hungarian meeting culture guide"
- Customer success stories

---

## 🎯 Exit Strategy

### Potential Acquirers (2-3 years)
1. **Glovo/Wolt** - Expanding into B2B services
2. **EPAM Hungary** - Needs internal tools
3. **OTP Bank** - Digital transformation
4. **Regional SaaS rollup** - DocuSign, etc.

### Valuation Targets
- Year 1: 2x revenue (€300k value)
- Year 2: 5x revenue (€2M value)
- Year 3: 10x revenue (€5M value)

---

## 📝 Daily Mantra

```
Ship beats perfect.
Revenue beats features.
Customers beat code.
Profit beats growth.
```

**Today's #1 Priority**: _____________

**This Week's Revenue Goal**: €_______

**Customers Talked To Today**: ___/1

---

*Updated: Daily*  
*Next Review: Every Monday*

Remember: You're not building a transcription app. You're building a profitable business that happens to do transcription.