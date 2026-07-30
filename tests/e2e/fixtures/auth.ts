import { test as base, expect, type Page } from '@playwright/test';

import { ADMIN, storageStateFor, type User } from '../helpers/auth';

// The login flow and the per-worker session cache live in `helpers/auth.ts` so
// worker-scoped fixtures and suite hooks share one login with this fixture.
export { ADMIN };
export type { User };

export const test = base.extend<{
	/**
	 * User identity for this test. Override with `test.use({ user: ... })` at
	 * the describe or test level to run the suite as a different user.
	 * Defaults to ADMIN (the pytest-bootstrap-seeded admin).
	 */
	user: User;

	/**
	 * A Page whose context is already authenticated as `user`. First request
	 * for a given user triggers one login per worker; the resulting
	 * storageState is held in memory and reused for all later requests.
	 */
	authedPage: Page;
}>({
	user: [ADMIN, { option: true }],

	authedPage: async ({ browser, user }, use) => {
		const storageState = await storageStateFor(browser, user);
		const ctx = await browser.newContext({ storageState });
		const page = await ctx.newPage();
		// Opt-in CPU throttling to reproduce GitHub-Linux-runner conditions on
		// developer machines. Set `STRESS=1` (typically with `CI=1` to also get
		// 2 workers + 2 retries) before running the suite — see CI-HARDENING.md.
		// The rate is the CPU slowdown multiplier; 4× matches the 2 vCPU runner.
		const throttleRate = Number(process.env.STRESS_CPU_RATE ?? '4');
		if (process.env.STRESS === '1') {
			const client = await ctx.newCDPSession(page);
			await client.send('Emulation.setCPUThrottlingRate', {
				rate: throttleRate,
			});
		}
		await use(page);
		await ctx.close();
	},
});

export { expect };
