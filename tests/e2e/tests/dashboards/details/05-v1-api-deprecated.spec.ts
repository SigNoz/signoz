import { expect, test } from '../../../fixtures/auth';
import { authToken } from '../../../helpers/dashboards';
import { createDashboardV2ViaApi } from '../../../helpers/dashboards-v2';

// Why every dashboards spec seeds through the v2 API: the v1 write API is gone.
//
// This matters beyond the specs. A V1-schema dashboard can no longer be created
// through the API at all, so the v1 -> v2 migration (pkg/transition/migrate_dashboard.go)
// cannot be exercised end to end from a browser test — it only ever runs on rows that
// predate the deprecation. Its coverage belongs to the Go tests that already have it
// (pkg/types/dashboardtypes/perses_v1_to_v2_test.go), and a spec that claimed to cover
// it here would be asserting nothing.

test.describe('Dashboards API — v1 writes are deprecated', () => {
	test('TC-01 POST /api/v1/dashboards is refused and points at v2', async ({
		authedPage: page,
	}) => {
		const token = await authToken(page);
		const res = await page.request.post('/api/v1/dashboards', {
			data: { title: 'v1-write-attempt', uploadedGrafana: false },
			headers: { Authorization: `Bearer ${token}` },
		});

		expect(res.ok()).toBe(false);
		const body = (await res.json()) as {
			error?: { code?: string; message?: string };
		};
		expect(body.error?.code).toBe('dashboard_deprecated');
		expect(body.error?.message).toContain('/api/v2/dashboards');
	});

	test('TC-02 the v2 write API accepts the same intent', async ({
		authedPage: page,
	}) => {
		const id = await createDashboardV2ViaApi(
			page,
			`v2-write-ok-${process.env.TEST_WORKER_INDEX ?? '0'}`,
		);
		expect(id).toBeTruthy();

		const token = await authToken(page);
		await page.request.delete(`/api/v2/dashboards/${id}`, {
			headers: { Authorization: `Bearer ${token}` },
		});
	});
});
