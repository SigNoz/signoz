import {
	alertRulesFixture,
	listRulesV3Response,
} from 'mocks-server/__mockdata__/alert_rules';
import { rest, server } from 'mocks-server/server';
import { AllTheProviders, renderHook, waitFor } from 'tests/test-utils';

import { useListAllRules } from '../useListAllRules';

const TOTAL = 250;

const rules = Array.from({ length: TOTAL }, (_, index) => ({
	...alertRulesFixture[0],
	id: `rule-${index}`,
	alert: `Rule ${index}`,
}));

describe('useListAllRules', () => {
	it('fetches every page past the 200-rule cap', async () => {
		const offsets: string[] = [];
		server.use(
			rest.get('http://localhost/api/v3/rules', (req, res, ctx) => {
				offsets.push(req.url.searchParams.get('offset') ?? '');
				return res(
					ctx.status(200),
					ctx.json(listRulesV3Response(rules, req.url.searchParams)),
				);
			}),
		);

		const { result } = renderHook(() => useListAllRules(), {
			wrapper: AllTheProviders,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(result.current.data).toHaveLength(TOTAL);
		expect(result.current.data?.[TOTAL - 1]?.id).toBe(`rule-${TOTAL - 1}`);
		expect(offsets.sort()).toStrictEqual(['0', '200']);
	});
});
