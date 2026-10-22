import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';

import { OrderByFilter } from '../OrderByFilter';

const fieldKeysURL = `${ENVIRONMENT.baseURL}/api/v1/fields/keys`;

const fieldKeysBody = (names: string[]): Record<string, unknown> => ({
	status: 'success',
	data: {
		complete: true,
		keys: Object.fromEntries(
			names.map((name) => [name, [{ name, fieldContext: 'resource' }]]),
		),
	},
});

const orderByInput = (): HTMLInputElement =>
	screen.getByTestId('order-by').querySelector('input') as HTMLInputElement;

function setup(query: Partial<IBuilderQuery>): { onChange: jest.Mock } {
	const onChange = jest.fn();
	render(
		<OrderByFilter
			query={
				{
					dataSource: DataSource.LOGS,
					aggregateOperator: 'noop',
					aggregateAttribute: { key: '' },
					groupBy: [],
					orderBy: [],
					aggregations: [{ expression: 'count()' }],
					...query,
				} as unknown as IBuilderQuery
			}
			onChange={onChange}
			isRawQuery
			isNewQueryV2
		/>,
	);
	return { onChange };
}

describe('OrderByFilter', () => {
	const requests: URLSearchParams[] = [];

	beforeAll(() => {
		server.listen();
	});
	afterEach(() => {
		server.resetHandlers();
		requests.length = 0;
		jest.clearAllMocks();
	});
	afterAll(() => {
		server.close();
	});

	it('offers fields API keys in both directions for a raw query', async () => {
		server.use(
			rest.get(fieldKeysURL, (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(ctx.status(200), ctx.json(fieldKeysBody(['service.name'])));
			}),
		);
		const { onChange } = setup({});

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(orderByInput());

		await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(1));
		expect(requests[0].get('signal')).toBe('logs');

		await screen.findByText('service.name desc');
		await user.click(await screen.findByText('service.name asc'));

		expect(onChange).toHaveBeenCalledWith([
			{ columnName: 'service.name', order: 'asc' },
		]);
	});
});
