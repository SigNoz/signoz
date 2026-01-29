import React from 'react';
import { fireEvent } from '@testing-library/react';
import { ENVIRONMENT } from 'constants/env';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import { IBuilderQuery } from '../../../../../types/api/queryBuilder/queryBuilderData';
import { DataSource } from '../../../../../types/common/queryBuilder';
import { GroupByFilter } from '../GroupByFilter';

const BASE_URL = ENVIRONMENT.baseURL;
const attributeKeysURL = `${BASE_URL}/api/v3/autocomplete/attribute_keys`;

function setup(
	overrides?: Partial<React.ComponentProps<typeof GroupByFilter>>,
): { onChange: jest.Mock } {
	const onChange = jest.fn();
	const query = ({
		dataSource: DataSource.METRICS,
		aggregateAttribute: { key: 'service.name' },
		aggregateOperator: 'COUNT',
		groupBy: [],
	} as unknown) as IBuilderQuery;
	render(
		<GroupByFilter
			query={query}
			onChange={onChange}
			disabled={false}
			signalSource="meter"
			{...overrides}
		/>,
	);
	return { onChange };
}

describe('GroupByFilter', () => {
	const dataSourceCalls: string[] = [];
	let callCount = 0;

	beforeAll(() => {
		server.listen();
	});
	afterEach(() => {
		server.resetHandlers();
		dataSourceCalls.length = 0;
		callCount = 0;
		jest.clearAllMocks();
	});
	afterAll(() => {
		server.close();
	});

	it('uses meter datasource for suggestions and normalization', async () => {
		server.use(
			rest.get(attributeKeysURL, (req, res, ctx) => {
				const ds = req.url.searchParams.get('dataSource') || '';
				dataSourceCalls.push(ds);
				callCount += 1;
				const attributeKeys =
					callCount === 1
						? [
								{
									id: 'service.name--string--',
									key: 'service.name',
									dataType: 'string',
									type: '',
								},
						  ]
						: [];
				return res(
					ctx.status(200),
					ctx.json({
						data: { attributeKeys },
					}),
				);
			}),
		);

		const { onChange } = setup();

		const select = screen.getByTestId('group-by');
		fireEvent.focus(select);

		await waitFor(() => expect(dataSourceCalls.length).toBeGreaterThanOrEqual(1));
		expect(dataSourceCalls[0]).toEqual('meter');

		const input = select.querySelector('input') as HTMLInputElement;
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.type(input, 'custom.attr');
		// wait for dropdown and select the option instead of hitting Enter
		await screen.findByRole('listbox');
		const option = await screen.findByRole('option', { name: 'custom.attr' });
		await user.click(option);

		expect(onChange).toHaveBeenCalled();
		expect(dataSourceCalls[dataSourceCalls.length - 1]).toEqual('meter');

		const emitted = onChange.mock.calls[0][0][0];
		expect(emitted.key).toEqual('custom.attr');
		expect(emitted.id).toBeTruthy();
		expect(emitted.id).not.toEqual('----');
	});
	it('clicks suggested option and emits proper value', async () => {
		server.use(
			rest.get(attributeKeysURL, (_req, res, ctx) =>
				res(
					ctx.status(200),
					ctx.json({
						status: 'success',
						data: {
							attributeKeys: [
								{
									id: 'service.name--string--',
									key: 'service.name',
									dataType: 'string',
									type: '',
								},
							],
						},
					}),
				),
			),
		);

		const { onChange } = setup();
		const combo = screen.getByRole('combobox');
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(combo);

		await screen.findByRole('listbox');
		const option = await screen.findByText(
			(content, el) =>
				content.trim() === 'service.name' &&
				!!el?.closest('.ant-select-item-option'),
		);
		await user.click(option);

		// Expect payload to be resolved to the exact attribute returned by MSW
		await waitFor(() => expect(onChange).toHaveBeenCalled());
		const emitted = onChange.mock.calls[0][0][0];
		expect(emitted.key).toEqual('service.name');
		expect(emitted.id).toEqual('service.name--string--');
	});
});
