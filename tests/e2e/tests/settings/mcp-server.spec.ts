import type { Page } from '@playwright/test';

import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import { authToken } from '../../helpers/dashboards';
import { personaSkipReason } from '../../helpers/settingsAccess';
import { SETTINGS_ROUTES } from '../../helpers/settings';

// MCP Server settings, two variants gated by mcp_url in /api/v1/global/config:
// full page (mcp_url present, cloud) vs NotCloudFallback (absent, community/self-hosted).
// RISK MODE — READ-ONLY: never create a service account; copy/create/install
// buttons asserted for presence only, never clicked.
// mcpEndpointPresent is probed in beforeAll (real backend state) so TC-01/TC-02
// skip via test.skip rather than branching in bodies (playwright/no-conditional-in-test).

test.describe.configure({ mode: 'serial' });

let mcpEndpointPresent = false;

test.beforeAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		const res = await page.request.get('/api/v1/global/config', {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.ok()) {
			const body = await res.json();
			const mcpUrl: unknown = body?.data?.mcp_url;
			mcpEndpointPresent = typeof mcpUrl === 'string' && mcpUrl.length > 0;
		}
	} finally {
		await ctx.close();
	}
});

async function gotoMcpServer(page: Page): Promise<void> {
	await page.goto(SETTINGS_ROUTES.MCP_SERVER);
	// Spinner gone => either full page or fallback has rendered.
	await expect(page.locator('.ant-spin-spinning')).toHaveCount(0);
}

test.describe('Settings — MCP Server page', () => {
	// Locators below use CSS classes / role-text; only mcp-settings has a data-testid.
	test('TC-01 full page renders: header, client tabs, auth card, use-cases card', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MCP_SERVER),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MCP_SERVER) ?? undefined,
		);
		// Full-page content requires mcp_url to be configured. If not present the
		// NotCloudFallback renders instead — TC-02 covers that path.
		test.skip(
			!mcpEndpointPresent,
			'PERSONA_SKIP: mcp_url not configured on this stack — NotCloudFallback renders; see TC-02',
		);

		await gotoMcpServer(page);

		await expect(page.getByTestId('mcp-settings')).toBeVisible();

		await expect(page.locator('.mcp-settings__header-title')).toContainText(
			'SigNoz MCP Server',
		);
		await expect(page.locator('.mcp-settings__header-subtitle')).toContainText(
			'Model Context Protocol',
		);

		await expect(page.locator('.mcp-settings__card')).toBeVisible();
		await expect(page.locator('.mcp-settings__card-title')).toContainText(
			'Configure your client',
		);

		const tabsRoot = page.locator('.mcp-client-tabs-root');
		await expect(tabsRoot).toBeVisible();
		await expect(tabsRoot.getByRole('tab', { name: /cursor/i })).toBeVisible();
		await expect(
			tabsRoot.getByRole('tab', { name: /claude code/i }),
		).toBeVisible();
		await expect(tabsRoot.getByRole('tab', { name: /vs code/i })).toBeVisible();

		await expect(
			page.locator('.mcp-client-tabs__snippet-pre').first(),
		).toBeVisible();

		await expect(
			page.getByRole('button', { name: /copy cursor config/i }),
		).toBeVisible();

		const authCard = page.locator('.mcp-auth-card');
		await expect(authCard).toBeVisible();
		await expect(authCard.locator('.mcp-auth-card__title')).toContainText(
			'Authenticate from your client',
		);

		await expect(
			authCard.locator('.mcp-auth-card__field-label').first(),
		).toContainText('SigNoz Instance URL');
		await expect(
			authCard.getByRole('button', { name: /copy signoz instance url/i }),
		).toBeVisible();

		await expect(
			authCard.locator('.mcp-auth-card__field-label').nth(1),
		).toContainText('API Key');
		await expect(
			authCard.getByRole('button', { name: /create service account/i }),
		).toBeVisible();

		const useCasesCard = page.locator('.mcp-use-cases-card');
		await expect(useCasesCard).toBeVisible();
		await expect(
			useCasesCard.locator('.mcp-use-cases-card__title'),
		).toContainText('What you can do with it');
		await expect(useCasesCard.locator('.mcp-use-cases-card__list')).toBeVisible();

		await expect(
			useCasesCard.getByRole('button', { name: /see more use cases/i }),
		).toBeVisible();
	});

	// Skipped when the beforeAll probe found mcp_url — full page renders instead.
	test('TC-02 NotCloudFallback renders when MCP endpoint is not configured', async ({
		authedPage: page,
		persona,
		env,
	}) => {
		test.skip(
			!!personaSkipReason(persona, env, SETTINGS_ROUTES.MCP_SERVER),
			personaSkipReason(persona, env, SETTINGS_ROUTES.MCP_SERVER) ?? undefined,
		);
		test.skip(
			mcpEndpointPresent,
			'PERSONA_SKIP: mcp_url is configured on this stack — NotCloudFallback does not render',
		);

		await gotoMcpServer(page);

		await expect(page.locator('.not-cloud-fallback')).toBeVisible();
		await expect(page.locator('.not-cloud-fallback__title')).toContainText(
			'MCP Server is available on SigNoz',
		);
		await expect(
			page.getByRole('button', { name: /view mcp server docs/i }),
		).toBeVisible();

		await expect(page.getByTestId('mcp-settings')).toHaveCount(0);
	});
});
