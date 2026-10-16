import React from 'react';
import { fireEvent } from '@testing-library/react';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import { IBuilderQuery } from '../../../../../types/api/queryBuilder/queryBuilderData';
import { DataSource } from '../../../../../types/common/queryBuilder';
import { GroupByFilter } from '../GroupByFilter';

const fieldKeysURL = `${ENVIRONMENT.baseURL}/api/v1/fields/keys`;

type FieldKeyVariant = {
	name: string;
	fieldContext: string;
	fieldDataType?: string;
};

const fieldKeysBody = (
	variants: FieldKeyVariant[],
): Record<string, unknown> => ({
	status: 'success',
	data: {
		complete: true,
		keys: variants.reduce<Record<string, FieldKeyVariant[]>>(
			(acc, variant) => ({
				...acc,
				[variant.name]: [...(acc[variant.name] ?? []), variant],
			}),
			{},
		),
	},
});

const groupByInput = (): HTMLInputElement =>
	screen.getByTestId('group-by').querySelector('input') as HTMLInputElement;

function setup(queryOverrides?: Partial<IBuilderQuery>): {
	onChange: jest.Mock;
} {
	const onChange = jest.fn();
	const query = {
		dataSource: DataSource.METRICS,
		aggregateAttribute: { key: 'signoz_calls_total' },
		aggregateOperator: 'COUNT',
		groupBy: [],
		...queryOverrides,
	} as unknown as IBuilderQuery;
	render(<GroupByFilter query={query} onChange={onChange} disabled={false} />);
	return { onChange };
}

// wait for dropdown and select the option instead of hitting Enter
async function clickOption(label: string): Promise<void> {
	const user = userEvent.setup({ pointerEventsCheck: 0 });
	const option = await screen.findByText(
		(content, el) =>
			content.trim() === label && !!el?.closest('.ant-select-item-option'),
	);
	await user.click(option);
}

describe('GroupByFilter', () => {
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

	function useFieldKeys(variants: FieldKeyVariant[]): void {
		server.use(
			rest.get(fieldKeysURL, (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(ctx.status(200), ctx.json(fieldKeysBody(variants)));
			}),
		);
	}

	it('asks the fields API for meter keys and emits a typed custom key', async () => {
		useFieldKeys([]);
		const { onChange } = setup({ source: 'meter' });

		fireEvent.focus(screen.getByTestId('group-by'));

		await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(1));
		expect(requests[0].get('signal')).toBe('metrics');
		expect(requests[0].get('source')).toBe('meter');
		expect(requests[0].get('metricName')).toBe('signoz_calls_total');

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.type(groupByInput(), 'custom.attr');
		await clickOption('custom.attr');

		expect(onChange).toHaveBeenCalled();
		const emitted = onChange.mock.calls[0][0][0];
		expect(emitted.key).toBe('custom.attr');
		expect(emitted.id).toBeTruthy();
		expect(emitted.id).not.toBe('----');
	});

	it('emits the picked suggestion with its context and data type', async () => {
		useFieldKeys([
			{ name: 'service.name', fieldContext: 'resource', fieldDataType: 'string' },
		]);
		const { onChange } = setup();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(groupByInput());
		await clickOption('service.name');

		await waitFor(() => expect(onChange).toHaveBeenCalled());
		// Expect payload to be resolved to the exact attribute returned by MSW
		expect(onChange.mock.calls[0][0][0]).toMatchObject({
			key: 'service.name',
			type: 'resource',
			dataType: 'string',
			id: 'service.name--string--resource',
		});
	});

	it('offers each context of a name as its own option', async () => {
		useFieldKeys([
			{ name: 'service.name', fieldContext: 'resource', fieldDataType: 'string' },
			{ name: 'service.name', fieldContext: 'attribute', fieldDataType: 'string' },
		]);
		setup();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(groupByInput());

		await waitFor(() =>
			expect(
				screen
					.getAllByText('service.name')
					.filter((el) => !!el.closest('.ant-select-item-option')),
			).toHaveLength(2),
		);
	});
});
