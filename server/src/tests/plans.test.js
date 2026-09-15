'use strict';

/**
 * Plan catalogue tests — the business rules behind the paywall.
 *
 *   npm test        (node --test)
 *
 * These assertions protect the exact licensing promise: free cannot create
 * pins, and the 1 / 3 / 6 month + lifetime licenses all grant unlimited pins.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { PLANS, PLAN_ORDER, getPlan, publicPlans } = require('../lib/plans');
const licenses = require('../lib/licenses');

test('the catalogue exposes exactly the four sellable licenses', () => {
  assert.deepEqual(PLAN_ORDER, ['monthly', 'quarterly', 'semiannual', 'lifetime']);
});

test('durations are 30 / 90 / 180 days and lifetime never expires', () => {
  assert.equal(PLANS.monthly.durationDays, 30);
  assert.equal(PLANS.quarterly.durationDays, 90);
  assert.equal(PLANS.semiannual.durationDays, 180);
  assert.equal(PLANS.lifetime.durationDays, null);
});

test('every paid plan grants unlimited pins, the free plan grants none', () => {
  assert.equal(PLANS.free.unlimitedPins, false);
  assert.equal(PLANS.free.dailyPins, 0);
  for (const id of PLAN_ORDER) {
    assert.equal(PLANS[id].unlimitedPins, true, `${id} must be unlimited`);
    assert.equal(PLANS[id].dailyPins, null, `${id} must not have a daily quota`);
    assert.ok(PLANS[id].price > 0, `${id} needs a price`);
    assert.ok(PLANS[id].features.length >= 3, `${id} needs at least three feature bullets`);
  }
});

test('the public payload hides internal flags', () => {
  const payload = publicPlans();
  assert.equal(payload.length, PLAN_ORDER.length);
  for (const plan of payload) {
    assert.deepEqual(Object.keys(plan).sort(), ['currency', 'durationDays', 'features', 'id', 'label', 'popular', 'price', 'tagline']);
  }
  assert.equal(payload.filter((plan) => plan.popular).length, 1, 'exactly one plan is highlighted');
});

test('getPlan falls back to the free plan for unknown ids', () => {
  assert.equal(getPlan('nonsense').id, 'free');
  assert.equal(getPlan('lifetime').id, 'lifetime');
  assert.equal(getPlan(undefined).id, 'free');
});

test('the free plan can never be turned into a sellable license key', () => {
  assert.throws(() => licenses.createLicense({ plan: 'free' }), /free plan/i);
});
