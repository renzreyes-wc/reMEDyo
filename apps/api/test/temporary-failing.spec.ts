import { describe, expect, it } from 'vitest';

/**
 * Temporary. This file exists only to prove that a failing test fails the
 * workflow, and is removed in the commit that follows it.
 */
describe('temporary', () => {
  it('fails on purpose', () => {
    expect(1).toBe(2);
  });
});
