'use strict';

/**
 * License plans.
 *
 * `unlimitedPins: true`  -> the account can create as many pins as it wants.
 * `durationDays: null`   -> lifetime (expires_at stays NULL).
 *
 * ⚠️ Set your real prices here - the UI reads them from GET /api/plans.
 */

const PLANS = {
  free: {
    id: 'free',
    label: 'Free',
    tagline: 'Browse the dashboard and demo data',
    durationDays: 0,
    unlimitedPins: false,
    dailyPins: 0,
    price: 0,
    currency: 'USD',
    features: ['Dashboard access', 'Demo data', 'Public reports'],
    missing: ['Create pins', 'Forensic reports', 'Team sharing'],
  },
  monthly: {
    id: 'monthly',
    label: '1 Month',
    tagline: 'Short term investigations',
    durationDays: 30,
    unlimitedPins: true,
    dailyPins: null,
    price: 9.99,
    currency: 'USD',
    features: ['Unlimited pins', 'Full forensic reports', 'PC information', 'Share with team'],
  },
  quarterly: {
    id: 'quarterly',
    label: '3 Months',
    tagline: 'Best value for servers',
    durationDays: 90,
    unlimitedPins: true,
    dailyPins: null,
    price: 24.99,
    currency: 'USD',
    popular: true,
    features: ['Unlimited pins', 'Full forensic reports', 'PC information', 'Share with team'],
  },
  semiannual: {
    id: 'semiannual',
    label: '6 Months',
    tagline: 'For established communities',
    durationDays: 180,
    unlimitedPins: true,
    dailyPins: null,
    price: 44.99,
    currency: 'USD',
    features: ['Unlimited pins', 'Full forensic reports', 'Priority queue', 'Share with team'],
  },
  lifetime: {
    id: 'lifetime',
    label: 'Lifetime',
    tagline: 'One payment, forever',
    durationDays: null,
    unlimitedPins: true,
    dailyPins: null,
    price: 99.99,
    currency: 'USD',
    features: ['Unlimited pins forever', 'Full forensic reports', 'Priority support', 'Early access'],
  },
};

/** Order used by the pricing modal. */
const PLAN_ORDER = ['monthly', 'quarterly', 'semiannual', 'lifetime'];

const getPlan = (id) => PLANS[id] || PLANS.free;

/** Public payload (no internal flags leaking into the UI contract). */
function publicPlans() {
  return PLAN_ORDER.map((id) => {
    const plan = PLANS[id];
    return {
      id: plan.id,
      label: plan.label,
      tagline: plan.tagline,
      price: plan.price,
      currency: plan.currency,
      durationDays: plan.durationDays,
      popular: Boolean(plan.popular),
      features: plan.features,
    };
  });
}

module.exports = { PLANS, PLAN_ORDER, getPlan, publicPlans };
