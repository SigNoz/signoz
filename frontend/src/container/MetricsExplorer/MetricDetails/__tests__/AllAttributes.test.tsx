import { render, screen } from '@testing-library/react';
import * as metricsExplorerHooks from 'api/generated/services/metrics';
import { MetrictypesTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { userEvent } from 'tests/test-utils';

import ROUTES from '../../../../constants/routes';
import AllAttributes from '../AllAttributes';
import { AllAttributesValue } from '../AllAttributesValue';
import { getMockMetricAttributesData, MOCK_METRIC_NAME } from './testUtlls';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER}`,
	}),
}));

const useGetMetricAttributesMock = jest.spyOn(
	metricsExplorerHooks,
	'useGetMetricAttributes',
);

describe('AllAttributes', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useGetMetricAttributesMock.mockReturnValue({
			...getMockMetricAttributesData(),
		});
	});

	it('renders attribute keys, values, and value counts from API data', () => {
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);

		expect(screen.getByText('attribute1')).toBeInTheDocument();
		expect(screen.getByText('attribute2')).toBeInTheDocument();
		expect(screen.getByText('value1')).toBeInTheDocument();
		expect(screen.getByText('value2')).toBeInTheDocument();
		expect(screen.getByText('value3')).toBeInTheDocument();
	});

	it('handles empty attributes array', () => {
		useGetMetricAttributesMock.mockReturnValue({
			...getMockMetricAttributesData({
				data: {
					attributes: [],
					totalKeys: 0,
				},
			}),
		});
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);

		expect(screen.getByText('All Attributes')).toBeInTheDocument();
		expect(screen.getByText('No attributes found')).toBeInTheDocument();
	});

	it('clicking on an attribute key shows popover with Open in Metric Explorer option', async () => {
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);
		await userEvent.click(screen.getByText('attribute1'));
		expect(screen.getByText('Open in Metric Explorer')).toBeInTheDocument();
		expect(screen.getByText('Copy Key')).toBeInTheDocument();
	});

	it('filters attributes based on search input', async () => {
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);
		await userEvent.type(screen.getByPlaceholderText('Search'), 'value1');

		expect(screen.getByText('attribute1')).toBeInTheDocument();
		expect(screen.getByText('value1')).toBeInTheDocument();
	});

	it('shows error state when attribute fetching fails', () => {
		useGetMetricAttributesMock.mockReturnValue({
			...getMockMetricAttributesData(
				{
					data: {
						attributes: [],
						totalKeys: 0,
					},
				},
				{
					isError: true,
				},
			),
		});
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);

		expect(
			screen.getByText('Something went wrong while fetching attributes'),
		).toBeInTheDocument();
	});

	it('does not show misleading empty text while loading', () => {
		useGetMetricAttributesMock.mockReturnValue({
			...getMockMetricAttributesData(
				{
					data: {
						attributes: [],
						totalKeys: 0,
					},
				},
				{
					isLoading: true,
				},
			),
		});
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);

		expect(screen.queryByText('No attributes found')).not.toBeInTheDocument();
	});
});

describe('AllAttributesValue', () => {
	const mockGoToMetricsExploreWithAppliedAttribute = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows All values button when there are more than 5 values', () => {
		render(
			<AllAttributesValue
				filterKey="attribute1"
				filterValue={['value1', 'value2', 'value3', 'value4', 'value5', 'value6']}
				goToMetricsExploreWithAppliedAttribute={
					mockGoToMetricsExploreWithAppliedAttribute
				}
			/>,
		);
		expect(screen.queryByText('value6')).not.toBeInTheDocument();
		expect(screen.getByText('All values (6)')).toBeInTheDocument();
	});

	it('All values popover shows values beyond the initial 5', async () => {
		const values = [
			'value1',
			'value2',
			'value3',
			'value4',
			'value5',
			'value6',
			'value7',
		];
		render(
			<AllAttributesValue
				filterKey="attribute1"
				filterValue={values}
				goToMetricsExploreWithAppliedAttribute={
					mockGoToMetricsExploreWithAppliedAttribute
				}
			/>,
		);

		await userEvent.click(screen.getByText('All values (7)'));

		expect(screen.getByText('value6')).toBeInTheDocument();
		expect(screen.getByText('value7')).toBeInTheDocument();
	});

	it('All values popover search filters the value list', async () => {
		const values = [
			'alpha',
			'bravo',
			'charlie',
			'delta',
			'echo',
			'fig-special',
			'golf-target',
		];
		render(
			<AllAttributesValue
				filterKey="attribute1"
				filterValue={values}
				goToMetricsExploreWithAppliedAttribute={
					mockGoToMetricsExploreWithAppliedAttribute
				}
			/>,
		);

		await userEvent.click(screen.getByText('All values (7)'));
		await userEvent.type(screen.getByPlaceholderText('Search values'), 'golf');

		expect(screen.getByText('golf-target')).toBeInTheDocument();
		expect(screen.queryByText('fig-special')).not.toBeInTheDocument();
	});
});
