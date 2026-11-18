import {
	expect,
	llmO11yDriver,
	onAdminPage,
	test,
} from '../../drivers/llm-o11y';
test.describe.configure({ mode: 'serial' });

const GROUP_NAME = 'e2e-attr-mapping-happy';
const GROUP_CONDITION = 'my_company.llm.';

const TARGET_ATTR = 'gen_ai.content.prompt';
const SOURCE_ATTR = 'my_company.llm.input';

test.afterAll(async ({ browser }) => {
	await onAdminPage(browser, (page) =>
		llmO11yDriver(page).deleteSpanMapperGroups([GROUP_NAME]),
	);
});

test.describe('LLM Observability — Attribute Mapping', () => {
	test('basic flow: add a mapping, test it, then save it to the backend', async ({
		authedPage: page,
		llm,
	}) => {
		await llm.gotoAttributeMapping();

		await llm.mapping.addGroup().click();
		const groupDrawer = llm.mapping.groupDrawer();
		await expect(groupDrawer).toBeVisible();
		await llm.mapping.groupName().fill(GROUP_NAME);
		await llm.mapping.addGroupAttribute().click();
		await llm.mapping.groupAttribute(0).fill(GROUP_CONDITION);
		await llm.mapping.saveGroup().click();
		await expect(groupDrawer).toBeHidden();

		const groupHeader = llm.mapping.groupHeader(GROUP_NAME);
		await expect(groupHeader).toBeVisible();
		await groupHeader.click();

		await llm.mapping.addMapper().click();
		const mapperDrawer = llm.mapping.mapperDrawer();
		await expect(mapperDrawer).toBeVisible();

		await llm.mapping.mapperTarget().fill(TARGET_ATTR);
		await llm.mapping.mapperSource(0).fill(SOURCE_ATTR);

		const mapperSave = llm.mapping.saveMapper();
		await expect(mapperSave).toBeEnabled();
		await mapperSave.click();
		await expect(mapperDrawer).toBeHidden();

		await expect(llm.mapping.unsavedChanges()).toBeVisible();

		await llm.mapping.tab('Test').click();
		await expect(llm.mapping.testTab()).toBeVisible();

		const testResponse = page.waitForResponse(
			(r) =>
				new URL(r.url()).pathname.endsWith('/span_mapper_groups/test') &&
				r.request().method() === 'POST',
		);
		await llm.mapping.runTest().click();
		expect((await testResponse).ok()).toBeTruthy();

		await expect(llm.mapping.testError()).toHaveCount(0);
		await expect(llm.mapping.testResults()).toBeVisible();

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

		await llm.mapping.saveChanges().click();

		expect((await createGroup).ok()).toBeTruthy();
		expect((await createMapper).ok()).toBeTruthy();

		await expect(llm.toast('Attribute mapping changes saved')).toBeVisible();
		await expect(llm.mapping.unsavedChanges()).toHaveCount(0);
	});
});
