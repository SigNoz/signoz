import { expect, test } from '../../fixtures/auth';
import { newAdminContext } from '../../helpers/auth';
import {
	deleteSpanMapperGroupsByName,
	gotoAttributeMapping,
} from '../../helpers/attribute-mapping';
import { authToken } from '../../helpers/common';

test.describe.configure({ mode: 'serial' });

const GROUP_NAME = 'e2e-attr-mapping-happy';

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

		await page.getByTestId('add-group-row').click();
		const groupDrawer = page.getByTestId('group-form-drawer');
		await expect(groupDrawer).toBeVisible();
		await page.getByTestId('group-form-name').fill(GROUP_NAME);
		await page.getByTestId('group-form-save').click();
		await expect(groupDrawer).toBeHidden();

		const groupHeader = page
			.locator('[data-testid^="group-expand-"]')
			.filter({ hasText: GROUP_NAME });
		await expect(groupHeader).toBeVisible();
		await groupHeader.click();

		await page.locator('[data-testid^="add-mapper-"]').click();
		const mapperDrawer = page.getByTestId('mapper-form-drawer');
		await expect(mapperDrawer).toBeVisible();

		await page.getByTestId('mapper-form-target').fill(TARGET_ATTR);
		await page.getByTestId('mapper-form-source-0').fill(SOURCE_ATTR);

		const mapperSave = page.getByTestId('mapper-form-save');
		await expect(mapperSave).toBeEnabled();
		await mapperSave.click();
		await expect(mapperDrawer).toBeHidden();

		await expect(page.getByTestId('unsaved-changes')).toBeVisible();

		await page.getByRole('tab', { name: 'Test' }).click();
		await expect(page.getByTestId('test-tab')).toBeVisible();

		const testResponse = page.waitForResponse(
			(r) =>
				new URL(r.url()).pathname.endsWith('/span_mapper_groups/test') &&
				r.request().method() === 'POST',
		);
		await page.getByTestId('run-test-button').click();
		expect((await testResponse).ok()).toBeTruthy();

		await expect(page.getByTestId('test-error')).toHaveCount(0);
		await expect(page.getByTestId('test-results')).toBeVisible();

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

		await page.getByTestId('save-changes-btn').click();

		expect((await createGroup).ok()).toBeTruthy();
		expect((await createMapper).ok()).toBeTruthy();

		await expect(page.getByText('Attribute mapping changes saved')).toBeVisible();
		await expect(page.getByTestId('unsaved-changes')).toHaveCount(0);
	});
});
