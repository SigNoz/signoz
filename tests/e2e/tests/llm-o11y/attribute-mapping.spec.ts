import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	deleteSpanMapperGroupsByName,
	gotoAttributeMapping,
} from '../../helpers/attribute-mapping';
import { authToken } from '../../helpers/common';

// One basic-flow test that mutates backend state — run serially so nothing
// races the create/save it performs. (All editing controls only render for
// admins; the pytest-bootstrap user is an admin.)
test.describe.configure({ mode: 'serial' });

// Unique group name so the flow is isolated from anything else in the stack and
// cleanup can target it precisely.
const GROUP_NAME = 'e2e-attr-mapping-happy';

// Target ← source chosen so the mapper matches the built-in SAMPLE_SPAN_JSON in
// the Test tab, whose attributes include `my_company.llm.input`. The group has
// no conditions, so it runs on every span and the test yields a populated result.
const TARGET_ATTR = 'gen_ai.content.prompt';
const SOURCE_ATTR = 'my_company.llm.input';

test.afterAll(async ({ browser }) => {
	const ctx = await newAdminContext(browser);
	const page = await ctx.newPage();
	try {
		const token = await authToken(page);
		await deleteSpanMapperGroupsByName(ctx.request, token, [GROUP_NAME]);
	} finally {
		await ctx.close();
	}
});

test.describe('LLM Observability — Attribute Mapping', () => {
	test('basic flow: add a mapping, test it, then save it to the backend', async ({
		authedPage: page,
	}) => {
		await gotoAttributeMapping(page);

		// ── 1. Add a group (no conditions → runs on every span) ──────────────
		await page.getByTestId('add-group-row').click();
		const groupDrawer = page.getByTestId('group-form-drawer');
		await expect(groupDrawer).toBeVisible();
		await page.getByTestId('group-form-name').fill(GROUP_NAME);
		await page.getByTestId('group-form-save').click();
		await expect(groupDrawer).toBeHidden();

		// The new group renders as a collapsible panel; expand it to reveal the
		// "Add mapping" affordance (antd Collapse unmounts collapsed content).
		const groupHeader = page
			.locator('[data-testid^="group-expand-"]')
			.filter({ hasText: GROUP_NAME });
		await expect(groupHeader).toBeVisible();
		await groupHeader.click();

		// ── 2. Add a mapper (target ← source) inside the group ───────────────
		await page.locator('[data-testid^="add-mapper-"]').click();
		const mapperDrawer = page.getByTestId('mapper-form-drawer');
		await expect(mapperDrawer).toBeVisible();

		// KeySearchInput fields accept free text; the assistive suggestions
		// dropdown closes on blur, so filling the source blurs the target.
		// (Deliberately no Escape — that would close the Radix drawer.)
		await page.getByTestId('mapper-form-target').fill(TARGET_ATTR);
		await page.getByTestId('mapper-form-source-0').fill(SOURCE_ATTR);

		const mapperSave = page.getByTestId('mapper-form-save');
		await expect(mapperSave).toBeEnabled();
		await mapperSave.click();
		await expect(mapperDrawer).toBeHidden();

		// The header now surfaces the unsaved-changes (dirty) state.
		await expect(page.getByTestId('unsaved-changes')).toBeVisible();

		// ── 3. Test the (still-unsaved) mapping against the sample span ──────
		await page.getByRole('tab', { name: 'Test' }).click();
		await expect(page.getByTestId('test-tab')).toBeVisible();

		const testResponse = page.waitForResponse(
			(r) =>
				new URL(r.url()).pathname.endsWith('/span_mapper_groups/test') &&
				r.request().method() === 'POST',
		);
		await page.getByTestId('run-test-button').click();
		expect((await testResponse).ok()).toBeTruthy();

		// Results render without error, and because the sample span carries
		// `my_company.llm.input` the mapper populates the target — non-empty result.
		await expect(page.getByTestId('test-error')).toHaveCount(0);
		await expect(page.getByTestId('test-results')).toBeVisible();

		// ── 4. Save to the backend (create group, then its mapper) ───────────
		const createGroup = page.waitForResponse(
			(r) =>
				new URL(r.url()).pathname.endsWith('/span_mapper_groups') &&
				r.request().method() === 'POST',
		);
		const createMapper = page.waitForResponse(
			(r) =>
				/\/span_mapper_groups\/[^/]+\/span_mappers$/.test(
					new URL(r.url()).pathname,
				) && r.request().method() === 'POST',
		);

		// The header Save button lives outside the tabs, so it is reachable
		// from the Test tab.
		await page.getByTestId('save-changes-btn').click();

		expect((await createGroup).ok()).toBeTruthy();
		expect((await createMapper).ok()).toBeTruthy();

		// Persist succeeded: success toast shows and the dirty marker clears.
		await expect(
			page.getByText('Attribute mapping changes saved'),
		).toBeVisible();
		await expect(page.getByTestId('unsaved-changes')).toHaveCount(0);
	});
});
