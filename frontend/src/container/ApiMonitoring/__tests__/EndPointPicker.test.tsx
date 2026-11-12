import {
	GetMetricQueryRange,
	GetQueryResultsProps,
} from 'lib/dashboard/getQueryResults';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';

import EndPointPicker from '../Explorer/Domains/DomainDetails/components/EndPointPicker';
import { SPAN_ATTRIBUTES } from '../Explorer/Domains/DomainDetails/constants';

jest.mock('lib/dashboard/getQueryResults', () => ({
	GetMetricQueryRange: jest.fn(),
}));

const mockGetMetricQueryRange = jest.mocked(GetMetricQueryRange);

const rowsResponse = (urls: string[]): MetricQueryRangeSuccessResponse => ({
	statusCode: 200,
	message: 'success',
	error: null,
	payload: {
		data: {
			resultType: '',
			newResult: { data: { result: [], resultType: '' } },
			result: [
				{
					metric: {},
					queryName: 'A',
					values: [],
					table: {
						columns: [],
						rows: urls.map((url) => ({
							data: { [SPAN_ATTRIBUTES.HTTP_URL]: url, A: 1 },
						})),
					},
				},
			],
		},
	},
});

const baseProps = {
	domainName: 'api.example.com',
	timeRange: { startTime: 1000, endTime: 2000 },
	filterExpression: "service.name = 'checkout'",
	value: '',
};

describe('EndPointPicker', () => {
	beforeEach(() => {
		mockGetMetricQueryRange.mockResolvedValue(
			rowsResponse(['/v1/charges', '/v1/refunds']),
		);
	});

	it('loads options for the domain scoped by the user filter', async () => {
		render(<EndPointPicker {...baseProps} onChange={jest.fn()} />);

		await waitFor(() => expect(mockGetMetricQueryRange).toHaveBeenCalled());
		const payload: GetQueryResultsProps =
			mockGetMetricQueryRange.mock.calls[0][0];
		expect(payload.query.builder.queryData[0].filter?.expression).toBe(
			`http_host = 'api.example.com' AND kind_string = 'Client' AND ${SPAN_ATTRIBUTES.HTTP_URL} EXISTS AND (service.name = 'checkout')`,
		);
	});

	it('reports the picked endpoint', async () => {
		const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
		const onChange = jest.fn() as jest.MockedFunction<
			(endPointName: string) => void
		>;
		render(<EndPointPicker {...baseProps} onChange={onChange} />);

		await waitFor(() => expect(mockGetMetricQueryRange).toHaveBeenCalled());
		await user.click(screen.getByTestId('endpoint-picker'));
		await screen.findByTestId('endpoint-picker-item-/v1/refunds');
		await user.type(
			screen.getByTestId('endpoint-picker-search'),
			'/v1/refunds{Enter}',
		);

		expect(onChange).toHaveBeenCalledWith('/v1/refunds');
	});

	it('shows All endpoints when none is picked and clears through it', async () => {
		const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });
		const onChange = jest.fn() as jest.MockedFunction<
			(endPointName: string) => void
		>;
		const { rerender } = render(
			<EndPointPicker {...baseProps} onChange={onChange} />,
		);

		expect(screen.getByTestId('endpoint-picker')).toHaveTextContent(
			'All endpoints',
		);

		rerender(
			<EndPointPicker {...baseProps} value="/v1/charges" onChange={onChange} />,
		);
		await waitFor(() => expect(mockGetMetricQueryRange).toHaveBeenCalled());
		await user.click(screen.getByTestId('endpoint-picker'));
		await screen.findByTestId('endpoint-picker-item-/v1/charges');
		await user.type(
			screen.getByTestId('endpoint-picker-search'),
			'All endpoints{Enter}',
		);

		expect(onChange).toHaveBeenCalledWith('');
	});

	it('shows the selected endpoint', async () => {
		render(
			<EndPointPicker {...baseProps} value="/v1/charges" onChange={jest.fn()} />,
		);

		await waitFor(() =>
			expect(screen.getByText('/v1/charges')).toBeInTheDocument(),
		);
	});
});
