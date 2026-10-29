import { withQueryBuilder } from '../../drivers/query-builder';
import {
	expect,
	test as alertRulesTest,
} from '../../fixtures/alerts/alert-rules';
import { AlertType } from '../../helpers/alert-forms/constants';
import { gotoCreateAlertV2 } from '../../helpers/alert-forms/navigation';
import {
	selectThresholdChannel,
	v2SaveButton,
} from '../../helpers/alert-forms/v2';
import { gotoAlertOverview } from '../../helpers/alerts/navigation';

const test = withQueryBuilder(alertRulesTest);

const FILTER_A = "http.method = 'GET'";
const FILTER_B = "http.status_code = '500'";
const TRACE_MATCH = 'A => B';

interface SavedRule {
	condition?: {
		compositeQuery?: {
			queries?: {
				type: string;
				spec: {
					name?: string;
					expression?: string;
					filter?: { expression?: string };
				};
			}[];
		};
	};
}

test.describe('Query builder — alerts', () => {
	test('TC-06 a trace-matching traces alert saves and reopens intact', async ({
		authedPage: page,
		alertChannel,
		ownedRules,
		qb,
	}) => {
		await gotoCreateAlertV2(page, { alertType: AlertType.TRACES });
		await page.getByTestId('alert-name-input').fill(`e2e-qb-tc06-${Date.now()}`);

		await qb.query('A').filter.type(FILTER_A);
		await qb.query('A').filter.press('Escape');
		const b = await qb.addQuery('B');
		await b.filter.type(FILTER_B);
		await b.filter.press('Escape');
		await qb.traceOperator.add();
		await qb.traceOperator.editor.type(TRACE_MATCH);
		await qb.traceOperator.editor.press('Escape');
		// Blur first: the editor's blur re-renders the condition section, which
		// otherwise closes the channel select as its click opens it.
		await qb.traceOperator.editor.content().blur();
		await selectThresholdChannel(page, 0, alertChannel.name);

		const [response] = await Promise.all([
			page.waitForResponse(
				(r) => r.url().includes('/api/v2/rules') && r.request().method() === 'POST',
			),
			v2SaveButton(page).click(),
		]);
		await ownedRules.register(response);
		const saved = response.request().postDataJSON() as SavedRule;
		const queries = saved.condition?.compositeQuery?.queries ?? [];
		expect(queries).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'builder_trace_operator',
					spec: expect.objectContaining({ expression: TRACE_MATCH }),
				}),
			]),
		);

		const { data } = (await response.json()) as { data: { id: string } };
		await gotoAlertOverview(page, String(data.id));

		await expect.poll(() => qb.query('A').filter.expression()).toBe(FILTER_A);
		await expect.poll(() => qb.query('B').filter.expression()).toBe(FILTER_B);
		await expect
			.poll(() => qb.traceOperator.editor.expression())
			.toBe(TRACE_MATCH);
	});
});
