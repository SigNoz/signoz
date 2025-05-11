import { fireEvent, render, screen } from '@testing-library/react';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import * as useHandleExplorerTabChange from 'hooks/useHandleExplorerTabChange';

import { MetricDetailsAttribute } from '../../../../api/metricsExplorer/getMetricDetails';
import ROUTES from '../../../../constants/routes';
import AllAttributes, { AllAttributesValue } from '../AllAttributes';

jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): { pathname: string } => ({
		pathname: `${ROUTES.METRICS_EXPLORER}`,
	}),
}));
const mockHandleExplorerTabChange = jest.fn();
jest
	.spyOn(useHandleExplorerTabChange, 'useHandleExplorerTabChange')
	.mockReturnValue({
		handleExplorerTabChange: mockHandleExplorerTabChange,
	});

const mockMetricName = 'test-metric';
const mockMetricType = MetricType.GAUGE;
const mockAttributes: MetricDetailsAttribute[] = [
	{
		key: 'attribute1',
		value: ['value1', 'value2'],
		valueCount: 2,
	},
	{
		key: 'attribute2',
		value: ['value3'],
		valueCount: 1,
	},
];

describe('AllAttributes', () => {
	it('renders attributes section with title', () => {
		render(
			<AllAttributes
				metricName={mockMetricName}
				attributes={mockAttributes}
				metricType={mockMetricType}
			/>,
		);

		expect(screen.getByText('All Attributes')).toBeInTheDocument();
	});

	it('renders all attribute keys and values', () => {
		render(
			<AllAttributes
				metricName={mockMetricName}
				attributes={mockAttributes}
				metricType={mockMetricType}
			/>,
		);

		// Check attribute keys are rendered
		expect(screen.getByText('attribute1')).toBeInTheDocument();
		expect(screen.getByText('attribute2')).toBeInTheDocument();

		// Check attribute values are rendered
		expect(screen.getByText('value1')).toBeInTheDocument();
		expect(screen.getByText('value2')).toBeInTheDocument();
		expect(screen.getByText('value3')).toBeInTheDocument();
	});

	it('renders value counts correctly', () => {
		render(
			<AllAttributes
				metricName={mockMetricName}
				attributes={mockAttributes}
				metricType={mockMetricType}
			/>,
		);

		expect(screen.getByText('2')).toBeInTheDocument(); // For attribute1
		expect(screen.getByText('1')).toBeInTheDocument(); // For attribute2
	});

	it('handles empty attributes array', () => {
		render(
			<AllAttributes
				metricName={mockMetricName}
				attributes={[]}
				metricType={mockMetricType}
			/>,
		);

		expect(screen.getByText('All Attributes')).toBeInTheDocument();
		expect(screen.queryByText('No data')).toBeInTheDocument();
	});

	it('clicking on an attribute key opens the explorer with the attribute filter applied', () => {
		render(
			<AllAttributes
				metricName={mockMetricName}
				attributes={mockAttributes}
				metricType={mockMetricType}
			/>,
		);
		fireEvent.click(screen.getByText('attribute1'));
		expect(mockHandleExplorerTabChange).toHaveBeenCalled();
	});

	it('filters attributes based on search input', () => {
		render(
			<AllAttributes
				metricName={mockMetricName}
				attributes={mockAttributes}
				metricType={mockMetricType}
			/>,
		);
		fireEvent.change(screen.getByPlaceholderText('Search'), {
			target: { value: 'value1' },
		});

		expect(screen.getByText('attribute1')).toBeInTheDocument();
		expect(screen.getByText('value1')).toBeInTheDocument();
	});
});

describe('AllAttributesValue', () => {
	const mockGoToMetricsExploreWithAppliedAttribute = jest.fn();

	it('renders all attribute values', () => {
		render(
			<AllAttributesValue
				filterKey="attribute1"
				filterValue={['value1', 'value2']}
				goToMetricsExploreWithAppliedAttribute={
					mockGoToMetricsExploreWithAppliedAttribute
				}
			/>,
		);
		expect(screen.getByText('value1')).toBeInTheDocument();
		expect(screen.getByText('value2')).toBeInTheDocument();
	});

	it('loads more attributes when show more button is clicked', () => {
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
		fireEvent.click(screen.getByText('Show More'));
		expect(screen.getByText('value6')).toBeInTheDocument();
	});

	it('does not render show more button when there are no more attributes to show', () => {
		render(
			<AllAttributesValue
				filterKey="attribute1"
				filterValue={['value1', 'value2']}
				goToMetricsExploreWithAppliedAttribute={
					mockGoToMetricsExploreWithAppliedAttribute
				}
			/>,
		);
		expect(screen.queryByText('Show More')).not.toBeInTheDocument();
	});
});
