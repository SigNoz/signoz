import { expect, PATH, test } from '../../drivers/routing';

// The shape of the router mount, which no other spec observes.

test.describe('Routing: router mount', () => {
	// Under a React transition the previous screen stays up instead of the
	// Suspense fallback, so an uncached route renders no loader at all.
	test('TC-18 an in-app navigation to an uncached route commits the Suspense fallback', async ({
		routing,
	}) => {
		await routing.dashboards.gotoList();

		await routing.whileScriptsHeld(async () => {
			await routing.sidebarItem('Alerts').click();
			await routing.waitForPath(PATH.alerts);

			await expect(routing.dashboards.landmark()).toBeHidden();
			await expect(routing.suspenseFallback()).toBeVisible();
		});

		await expect(routing.alerts.landmark()).toBeVisible();
	});

	// nuqs' react-router adapter needs a router above it; the wrong order throws
	// on the first page that reads a nuqs param.
	test('TC-19 a page with nuqs params mounts with no router-context error', async ({
		routing,
	}) => {
		const reported = routing.recordMessages();

		await routing.k8s.goto({ relativeTime: '30m' });

		expect(
			reported.filter((text) =>
				/useNavigate|useSearchParams|context of a <Router>/i.test(text),
			),
		).toEqual([]);
	});
});
