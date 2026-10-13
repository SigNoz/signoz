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

function setup(
	overrides?: Partial<React.ComponentProps<typeof GroupByFilter>>,
): { onChange: jest.Mock } {
	const onChange = jest.fn();
	const query = {
		dataSource: DataSource.METRICS,
		aggregateAttribute: { key: 'signoz_calls_total' },
		aggregateOperator: 'COUNT',
		groupBy: [],
	} as unknown as IBuilderQuery;
	render(
		<GroupByFilter
			query={query}
			onChange={onChange}
			disabled={false}
			{...overrides}
		/>,
	);
	return { onChange };
}

const groupByInput = (): HTMLInputElement =>
	screen.getByTestId('group-by').querySelector('input') as HTMLInputElement;

async function clickOptionVisible(label: string): Promise<void> {
	await screen.findByText(
		(content, el) =>
			content.trim() === label && !!el?.closest('.ant-select-item-option'),
	);
}

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
		const { onChange } = setup({ signalSource: 'meter' });

		fireEvent.focus(screen.getByTestId('group-by'));

		await waitFor(() => expect(requests.length).toBeGreaterThanOrEqual(1));
		expect(requests[0].get('signal')).toBe('metrics');
		expect(requests[0].get('source')).toBe('meter');
		expect(requests[0].get('metricName')).toBe('signoz_calls_total');

		const input = groupByInput();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.type(input, 'custom.attr');
		await clickOption('custom.attr');

		expect(onChange).toHaveBeenCalled();
		const emitted = onChange.mock.calls[0][0][0];
		expect(emitted.key).toBe('custom.attr');
		expect(emitted.id).toBe('custom.attr----');
	});

	it('emits the picked suggestion by name only', async () => {
		useFieldKeys([
			{ name: 'service.name', fieldContext: 'resource', fieldDataType: 'string' },
		]);
		const { onChange } = setup();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(groupByInput());
		await clickOption('service.name');

		await waitFor(() => expect(onChange).toHaveBeenCalled());
		expect(onChange.mock.calls[0][0][0]).toMatchObject({
			key: 'service.name',
			id: 'service.name----',
			type: '',
			dataType: '',
		});
	});

	it('shows one option per name when the API returns several contexts', async () => {
		useFieldKeys([
			{ name: 'service.name', fieldContext: 'resource' },
			{ name: 'service.name', fieldContext: 'attribute' },
			{ name: 'host.name', fieldContext: 'resource' },
		]);
		setup();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(groupByInput());

		await waitFor(() =>
			expect(
				screen
					.getAllByText('service.name')
					.filter((el) => !!el.closest('.ant-select-item-option')),
			).toHaveLength(1),
		);
	});

	it('stores a typed context prefix inside the key with no type', async () => {
		useFieldKeys([{ name: 'service.name', fieldContext: 'attribute' }]);
		const { onChange } = setup();

		const input = groupByInput();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.type(input, 'attribute.serv');

		await waitFor(() =>
			expect(
				requests.some((params) => params.get('searchText') === 'attribute.serv'),
			).toBe(true),
		);
		await clickOption('attribute.service.name');

		await waitFor(() => expect(onChange).toHaveBeenCalled());
		expect(onChange.mock.calls[0][0][0]).toMatchObject({
			key: 'attribute.service.name',
			type: '',
			dataType: '',
			id: 'attribute.service.name----',
		});
	});

	it('keeps the previous list while the next search loads', async () => {
		let release: () => void = () => {};
		server.use(
			rest.get(fieldKeysURL, async (req, res, ctx) => {
				const searchText = req.url.searchParams.get('searchText') ?? '';
				requests.push(req.url.searchParams);
				if (searchText === 'host') {
					await new Promise<void>((resolve) => {
						release = resolve;
					});
					return res(
						ctx.status(200),
						ctx.json(
							fieldKeysBody([{ name: 'host.name', fieldContext: 'resource' }]),
						),
					);
				}
				return res(
					ctx.status(200),
					ctx.json(
						fieldKeysBody([{ name: 'service.name', fieldContext: 'resource' }]),
					),
				);
			}),
		);
		setup();

		const input = groupByInput();
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(groupByInput());
		await clickOptionVisible('service.name');

		await user.type(input, 'host');
		await waitFor(() =>
			expect(requests.some((params) => params.get('searchText') === 'host')).toBe(
				true,
			),
		);
		expect(
			screen
				.getAllByText('service.name')
				.filter((el) => !!el.closest('.ant-select-item-option')),
		).toHaveLength(1);

		release();
		await screen.findByText(
			(content, el) =>
				content.trim() === 'host.name' && !!el?.closest('.ant-select-item-option'),
		);
	});

	it('does not offer a name that is already grouped with a context prefix', async () => {
		useFieldKeys([
			{ name: 'service.name', fieldContext: 'attribute' },
			{ name: 'host.name', fieldContext: 'attribute' },
		]);
		setup({
			query: {
				dataSource: DataSource.LOGS,
				groupBy: [
					{
						key: 'resource.service.name',
						type: '',
						dataType: '',
						id: 'resource.service.name----',
					},
				],
			} as unknown as IBuilderQuery,
		});

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(groupByInput());
		await clickOptionVisible('host.name');

		expect(
			screen
				.queryAllByText('service.name')
				.filter((el) => !!el.closest('.ant-select-item-option')),
		).toHaveLength(0);
	});

	it('keeps the suggested name whole when it starts with a context word', async () => {
		useFieldKeys([{ name: 'log.file.path', fieldContext: 'attribute' }]);
		const { onChange } = setup();

		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(groupByInput());
		await clickOption('log.file.path');

		await waitFor(() => expect(onChange).toHaveBeenCalled());
		expect(onChange.mock.calls[0][0][0]).toMatchObject({
			key: 'log.file.path',
			type: '',
		});
	});

	it('shows stored keys as they are, whatever their type', () => {
		setup({
			query: {
				dataSource: DataSource.LOGS,
				groupBy: [
					{
						key: 'service.name',
						type: 'resource',
						dataType: '',
						id: 'service.name----resource',
					},
					{ key: 'host.name', type: 'tag', dataType: '', id: 'host.name----tag' },
				],
			} as unknown as IBuilderQuery,
		});

		expect(screen.getByText('service.name')).toBeInTheDocument();
		expect(screen.getByText('host.name')).toBeInTheDocument();
	});
});
