import {
	TelemetrytypesFieldContextDTO,
	TelemetrytypesFieldDataTypeDTO,
	TelemetrytypesSignalDTO,
	type GetFieldsKeys200,
} from 'api/generated/services/sigNoz.schemas';
import { ENVIRONMENT } from 'constants/env';
import { DEBOUNCE_DELAY } from 'constants/queryBuilderFilterConfig';
import { initialQueriesMap } from 'constants/queryBuilder';
import { rest, server } from 'mocks-server/server';
import {
	act,
	render,
	screen,
	userEvent,
	waitFor,
	NO_DELAY_USER_EVENT,
} from 'tests/test-utils';
import type { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';

import DistributionFieldSelect from '../DistributionFieldSelect';

const keysResponse: GetFieldsKeys200 = {
	status: 'success',
	data: {
		complete: true,
		keys: {
			duration_nano: [
				{
					name: 'duration_nano',
					fieldContext: TelemetrytypesFieldContextDTO.span,
					fieldDataType: TelemetrytypesFieldDataTypeDTO.float64,
					signal: TelemetrytypesSignalDTO.traces,
				},
			],
			quantity: [
				{
					name: 'quantity',
					fieldContext: TelemetrytypesFieldContextDTO.attribute,
					fieldDataType: TelemetrytypesFieldDataTypeDTO.float64,
					signal: TelemetrytypesSignalDTO.traces,
				},
			],
		},
	},
};

const tracesQuery = (expression: string): IBuilderQuery => ({
	...(initialQueriesMap.traces.builder.queryData[0] as IBuilderQuery),
	aggregations: [{ expression }],
});

describe('DistributionFieldSelect', () => {
	const requests: URLSearchParams[] = [];

	afterEach(() => {
		jest.useRealTimers();
	});

	beforeEach(() => {
		requests.length = 0;
		server.use(
			rest.get(`${ENVIRONMENT.baseURL}/api/v1/fields/keys`, (req, res, ctx) => {
				requests.push(req.url.searchParams);
				return res(ctx.status(200), ctx.json(keysResponse));
			}),
		);
	});

	it('shows the saved field', () => {
		render(
			<DistributionFieldSelect
				queryData={tracesQuery('duration_nano')}
				onChange={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('distribution-field-select')).toHaveTextContent(
			'duration_nano',
		);
	});

	it('picks a numeric field, keeping its context', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		const onChange = jest.fn() as jest.MockedFunction<(field: string) => void>;
		render(
			<DistributionFieldSelect queryData={tracesQuery('')} onChange={onChange} />,
		);

		await user.click(screen.getByTestId('distribution-field-select'));
		await screen.findByTestId(
			'distribution-field-select-item-attribute.quantity',
		);
		await user.type(
			screen.getByTestId('distribution-field-select-search'),
			'attribute.quantity{Enter}',
		);

		expect(onChange).toHaveBeenCalledWith('attribute.quantity');
		expect(requests[0].get('fieldDataType')).toBe(
			TelemetrytypesFieldDataTypeDTO.number,
		);
		expect(requests[0].get('signal')).toBe('traces');
	});

	it('replaces the saved field with the newly picked one', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		const onChange = jest.fn() as jest.MockedFunction<(field: string) => void>;
		render(
			<DistributionFieldSelect
				queryData={tracesQuery('duration_nano')}
				onChange={onChange}
			/>,
		);

		await user.click(screen.getByTestId('distribution-field-select'));
		await screen.findByTestId(
			'distribution-field-select-item-attribute.quantity',
		);
		await user.type(
			screen.getByTestId('distribution-field-select-search'),
			'attribute.quantity{Enter}',
		);

		expect(onChange).toHaveBeenCalledWith('attribute.quantity');
	});

	it('only offers listed fields: typed text is a filter, not a value', async () => {
		const user = userEvent.setup(NO_DELAY_USER_EVENT);
		render(
			<DistributionFieldSelect queryData={tracesQuery('')} onChange={jest.fn()} />,
		);

		await user.click(screen.getByTestId('distribution-field-select'));
		await screen.findByTestId(
			'distribution-field-select-item-attribute.quantity',
		);
		await user.type(
			screen.getByTestId('distribution-field-select-search'),
			'no_such_field',
		);

		await screen.findByText('No numeric fields');
		expect(
			screen.queryByTestId('distribution-field-select-item-no_such_field'),
		).not.toBeInTheDocument();
	});

	it('searches the server for typed text, past the listed fields', async () => {
		jest.useFakeTimers();
		const user = userEvent.setup({
			advanceTimers: (ms) => jest.advanceTimersByTime(ms),
			pointerEventsCheck: 0,
		});
		render(
			<DistributionFieldSelect queryData={tracesQuery('')} onChange={jest.fn()} />,
		);

		await user.click(screen.getByTestId('distribution-field-select'));
		await user.type(
			await screen.findByTestId('distribution-field-select-search'),
			'queue',
		);
		act(() => {
			jest.advanceTimersByTime(DEBOUNCE_DELAY);
		});

		await waitFor(() => expect(requests.at(-1)?.get('searchText')).toBe('queue'));
	});
});
