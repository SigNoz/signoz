/**
 * Phase-1 smoke: the registry and the seeder work for every entity on both
 * routes. This is the gate the rest of `base/` is built on — if an entity's
 * seed dataset, category param, row testid or default columns are wrong, it
 * fails here as its own named describe instead of taking a whole base spec down.
 */

import { expect, test } from '../../fixtures/auth';
import {
	expectDefaultColumns,
	expectTotalCountLabel,
} from '../../helpers/infra-monitoring/assertions';
import type { DatasetKey } from '../../helpers/infra-monitoring/datasets';
import { ENTITIES } from '../../helpers/infra-monitoring/entities';
import {
	gotoScopedList,
	querySearchEditor,
	resetTableState,
	waitForRow,
} from '../../helpers/infra-monitoring/list';
import {
	assertDatasetFacts,
	seedDataset,
} from '../../helpers/infra-monitoring/seed';

for (const entity of ENTITIES) {
	test.describe(`smoke ${entity.key}`, () => {
		test(`SMOKE-01 ${entity.key}: seeded rows render with the registry's default columns`, async ({
			authedPage: page,
		}) => {
			// Fails loudly here if the integration fixture drifted from what the
			// registry claims about it.
			assertDatasetFacts(entity.seed.primary as DatasetKey);

			await resetTableState(page, entity);
			const seeded = await seedDataset(page, entity.seed.primary as DatasetKey);
			expect(seeded.names).toContain(entity.seed.sampleName);

			// Scoped, not `gotoList`: the stack accumulates every other spec's entities,
			// so the sample row is regularly not on page one of an unfiltered list.
			await gotoScopedList(page, entity, seeded.names);
			await expect(querySearchEditor(page)).toBeVisible();

			// `getRowTestId` defaults to `row-<getRowKey(record)>`, which is the entity
			// name everywhere except pods, where it is the pod UID.
			await waitForRow(page, entity.seed.sampleItemKey);

			await expectDefaultColumns(page, entity);
			await expectTotalCountLabel(page, entity);
		});
	});
}
