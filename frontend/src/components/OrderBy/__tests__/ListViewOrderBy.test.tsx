import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { ENVIRONMENT } from 'constants/env';
import { TRACE_VIEW_ORDER_BY_KEYS } from 'container/LLMObservability/Explorer/constants';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';
import { DataSource } from 'types/common/queryBuilder';

import ListViewOrderBy from '../ListViewOrderBy';

const seenAI: URLSearchParams[] = [];
const seenGeneric: URLSearchParams[] = [];

const mockAIKeys = (names: string[]): void => {
	server.use(
		rest.get(
			`${ENVIRONMENT.baseURL}/api/v1/ai_observability/fields/keys`,
			(req, res, ctx) => {
				seenAI.push(req.url.searchParams);
				return res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							complete: true,
							keys: Object.fromEntries(names.map((name) => [name, [{ name }]])),
						},
					}),
				);
			},
		),
	);
};

const mockGenericKeys = (names: string[]): void => {
	server.use(
		rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (req, res, ctx) => {
			seenGeneric.push(req.url.searchParams);
			return res(
				ctx.status(200),
				ctx.json({
					status: 'success',
					data: {
						complete: true,
						keys: Object.fromEntries(names.map((name) => [name, [{ name }]])),
					},
				}),
			);
		}),
	);
};

const openDropdown = (): void => {
	fireEvent.mouseDown(screen.getByRole('combobox'));
};

const getOptionLabels = (): string[] =>
	Array.from(document.querySelectorAll('.ant-select-item-option-content')).map(
		(node) => node.textContent ?? '',
	);

describe('ListViewOrderBy', () => {
	beforeEach(() => {
		seenAI.length = 0;
		seenGeneric.length = 0;
	});

	it('reads the ai_observability trace context for an AI query', async () => {
		mockAIKeys(['total_tokens']);

		render(
			<ListViewOrderBy
				value="last_activity_time:desc"
				onChange={jest.fn()}
				dataSource={DataSource.TRACES}
				fieldKeysConfig={TRACE_VIEW_ORDER_BY_KEYS}
			/>,
		);

		await waitFor(() => {
			expect(seenAI).toHaveLength(1);
		});
		expect(seenAI[0]?.get('searchText')).toBe('');
		expect(seenAI[0]?.get('fieldContext')).toBe(
			TelemetrytypesFieldContextDTO.trace,
		);
		expect(seenGeneric).toHaveLength(0);
	});

	it('offers the static keys alongside the ones the endpoint reports', async () => {
		mockAIKeys(['total_tokens']);

		render(
			<ListViewOrderBy
				value="last_activity_time:desc"
				onChange={jest.fn()}
				dataSource={DataSource.TRACES}
				fieldKeysConfig={TRACE_VIEW_ORDER_BY_KEYS}
			/>,
		);

		openDropdown();

		await waitFor(() => {
			expect(getOptionLabels()).toContain('total_tokens (desc)');
		});
		expect(getOptionLabels()).toContain('last_activity_time (asc)');
	});

	it('keeps a matching static key while searching', async () => {
		mockAIKeys([]);

		render(
			<ListViewOrderBy
				value="last_activity_time:desc"
				onChange={jest.fn()}
				dataSource={DataSource.TRACES}
				fieldKeysConfig={TRACE_VIEW_ORDER_BY_KEYS}
			/>,
		);

		await waitFor(() => {
			expect(seenAI.length).toBeGreaterThan(0);
		});

		openDropdown();
		fireEvent.change(screen.getByRole('combobox'), {
			target: { value: 'activity' },
		});

		await waitFor(() => {
			expect(getOptionLabels()).toContain('last_activity_time (desc)');
		});
	});

	it('defaults to timestamp and the generic endpoint', async () => {
		mockGenericKeys(['service.name']);

		render(
			<ListViewOrderBy
				value="timestamp:desc"
				onChange={jest.fn()}
				dataSource={DataSource.TRACES}
			/>,
		);

		await waitFor(() => {
			expect(seenGeneric).toHaveLength(1);
		});
		expect(seenGeneric[0]?.get('signal')).toBe(DataSource.TRACES);
		expect(seenGeneric[0]?.get('searchText')).toBe('');

		openDropdown();

		await waitFor(() => {
			expect(getOptionLabels()).toContain('timestamp (desc)');
		});
	});
});
