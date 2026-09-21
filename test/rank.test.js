const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { decodeRank } = require('../src/steam');

describe('decodeRank', () => {
  it('returns Uncalibrated for falsy tier', () => {
    assert.equal(decodeRank(0), 'Uncalibrated');
    assert.equal(decodeRank(null), 'Uncalibrated');
  });

  it('maps known tiers', () => {
    assert.equal(decodeRank(11), 'Herald 1');
    assert.equal(decodeRank(75), 'Divine 5');
    assert.equal(decodeRank(80), 'Immortal 0');
  });
});
