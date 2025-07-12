# Archived Documentation

This directory contains outdated documentation that has been superseded by newer versions.

## Archived Files

### Pricing Documentation (Archived 2025-07-07)
- `pricing-visualization.md` - Old pricing strategy with simple minute-based tiers
- `hungarian-market-strategy.md` - Initial market strategy (replaced by mode-based pricing)
- `pricing-dashboard.html` - Original interactive dashboard (Chrome performance issues)
- `pricing-dashboard-lite.html` - Simplified version (still outdated model)
- `honest-pricing-concerns.md` - Important cost analysis (partially integrated into new strategy)

## Current Documentation

The latest pricing strategy can be found in:
- `/docs/final-pricing-strategy.html` - Comprehensive mode-based pricing strategy
- `/lib/payments/subscription-plans.ts` - Implementation of the 3+1 tier system

## Why These Were Archived

1. **Pricing Model Change**: Moved from simple minute-based to mode-based allocation (Fast/Balanced/Precision)
2. **Cost Protection**: Old unlimited models risked AI cost explosion
3. **Market Alignment**: Better suited for Hungarian market with 3+1 tier structure
4. **Technical Issues**: Original HTML dashboards caused Chrome performance problems