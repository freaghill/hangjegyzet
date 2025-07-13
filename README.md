# HangJegyzet 🎯

AI-powered meeting transcription and insights platform for Hungarian businesses.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/freaghill/hangjegyzet)

**🚀 Status: Pre-launch (30 days to go)**  
**🎯 Goal: 100 paying customers in first month**  
**💰 Unit Economics: €0.65 cost/user, €25+ revenue/user**  
**🏭 Hosting: Hetzner (€39/month)**

## 🚨 IMPORTANT: Launch Mode Active

**We are in LAUNCH MODE. No new features until we have 100 paying customers.**

- 📋 See [LAUNCH_ROADMAP.md](./LAUNCH_ROADMAP.md) for the 30-day plan
- 💼 See [BUSINESS_TRACKER.md](./BUSINESS_TRACKER.md) for metrics
- 🖥️ See [HETZNER_DEPLOYMENT.md](./docs/HETZNER_DEPLOYMENT.md) for deployment

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/hangjegyzet-ai.git
cd hangjegyzet-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local

# Run development server
npm run dev

# Open http://localhost:3000
```

## 🏗️ Tech Stack (Simplified for Launch)

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js on Hetzner VPS (PM2)
- **AI**: OpenAI Whisper + Claude API
- **Database**: PostgreSQL 15 (self-hosted)
- **Cache**: Redis (self-hosted)
- **Payments**: Stripe (HUF support)
- **Hosting**: Hetzner CX41 (€39/month)

## 📚 Essential Documentation

- [LAUNCH_ROADMAP.md](./LAUNCH_ROADMAP.md) - **READ THIS FIRST**
- [BUSINESS_TRACKER.md](./BUSINESS_TRACKER.md) - Financials & metrics
- [HETZNER_DEPLOYMENT.md](./docs/HETZNER_DEPLOYMENT.md) - Server setup
- [AI_FEATURES_GUIDE.md](./docs/AI_FEATURES_GUIDE.md) - Feature documentation

## 🔐 Security (Launch Version)

- ✅ HTTPS everywhere
- ✅ Encrypted file storage
- ✅ GDPR compliant
- ✅ Regular backups
- 🔄 SOC2 (future)

## ✅ Launch Features (What Actually Works)

### Ready Now
- 🎙️ Upload audio (up to 2GB)
- 📝 Get accurate Hungarian transcript
- 🤖 AI-powered summary and action items
- 📄 Export to Word/PDF
- 💳 Pay with card (Stripe)
- 🔐 Secure file handling

### Coming Soon (Post-Launch)
- 🔴 Real-time transcription
- 📊 Advanced analytics
- 🔗 Zoom/Teams integration
- 📱 Mobile app
- 🏢 Team features

## 💰 Pricing

- **Indulo**: 9,990 Ft/month (~€25)
- **Profi**: 29,990 Ft/month (~€75)
- **Vallalati**: 89,990 Ft/month (~€225)

All plans include different amounts of Fast/Balanced/Precision minutes.

## 🎯 Current Priorities

1. **Fix critical bugs only**
2. **Make payment flow bulletproof**
3. **Polish user experience**
4. **Get 100 paying customers**
5. **Then add new features**

## 📄 License

Proprietary - All rights reserved

---

**Remember: Ship beats perfect. Revenue beats features.**