import { describe, expect, it } from 'vitest';
import { filterByTier } from '../src/shuffles.js';
import type { CatalogService } from '../src/catalog.js';

// prd.md §9-4 #7: theme shuffles split into mainstream("주류")/emerging("비주류")
// services via a `?tier=` query param. These are pure-function unit tests for the
// filter itself; integration.gyro.test.ts covers it end-to-end through the API.
describe('filterByTier', () => {
  const base: Omit<CatalogService, 'tier'> = {
    id: 'x', name: 'x', tagline: 'x', description: 'x', imageUrl: 'x', serviceUrl: 'https://example.com',
    tags: [], audiences: ['other'], room: 'x', roomKey: 'x', number: '1',
  };
  const mainstream: CatalogService = { ...base, id: 'main', tier: 'mainstream' };
  const emerging: CatalogService = { ...base, id: 'emerge', tier: 'emerging' };
  const untagged: CatalogService = { ...base, id: 'untagged' };
  const services = [mainstream, emerging, untagged];

  it('returns every service when tier is missing or unrecognized', () => {
    expect(filterByTier(services, undefined)).toEqual(services);
    expect(filterByTier(services, 'all')).toEqual(services);
  });

  it('keeps only mainstream services, treating untagged entries as mainstream', () => {
    expect(filterByTier(services, 'mainstream')).toEqual([mainstream, untagged]);
  });

  it('keeps only emerging services', () => {
    expect(filterByTier(services, 'emerging')).toEqual([emerging]);
  });
});
