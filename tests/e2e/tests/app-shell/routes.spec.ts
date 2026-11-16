import { expect, REDIRECTS, ROUTES, test } from '../../drivers/shell';

// The broad regression net: every top-level route mounts its own component
// without tripping an error boundary, a console error or a failed request.

test.describe('app shell — routes', () => {
	for (const probe of [...ROUTES, ...REDIRECTS]) {
		test(probe.title, async ({ shell, noise }) => {
			await shell.visit(probe);

			await expect(shell.errorBoundary()).toHaveCount(
				probe.expectBoundary ? 1 : 0,
			);
			expect(shell.pathname()).toBe(probe.expectPath ?? probe.path.split('?')[0]);
			expect(shell.unexpectedErrors(noise, probe)).toEqual([]);
			expect(shell.unexpectedFailures(noise, probe)).toEqual([]);
		});
	}

	test('TC-32 the side nav offers no assistant entry without an assistant URL', async ({
		shell,
	}) => {
		await shell.home.goto();
		await expect(shell.nav.item('home')).toBeVisible();
		await expect(shell.nav.item('ai-assistant')).toHaveCount(0);
	});

	test('TC-35 a logged-out visitor to /dashboard lands on /login', async ({
		guest,
	}) => {
		await guest.goto('/dashboard');
		await expect.poll(() => guest.pathname()).toBe('/login');
		await expect(guest.emailInput()).toBeVisible();
	});
});
