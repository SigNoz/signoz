import { kit } from '../kit';

import { withInfraMonitoring } from './driver';

/**
 * The infra-monitoring `test`.
 *
 * Seeding is explicit rather than a fixture: a dataset belongs to one spec's
 * `beforeAll`, is additive across the shared stack, and every scenario scopes
 * its list to the names it seeded. See `seed.ts`.
 */
export const test = withInfraMonitoring(kit);

export { expect } from '../kit';
export * from './driver';
export * from './entities';
export * from './seed';
export { DATASETS, type DatasetKey } from './__generated__/datasets';
