import { fireEvent, render, screen } from '@testing-library/react';
import * as useHandleExplorerTabChange from 'hooks/useHandleExplorerTabChange';

import { MetricDetailsAttribute } from '../../../../api/metricsExplorer/getMetricDetails';
import ROUTES from '../../../../constants/routes';
import AllAttributes from '../AllAttributes';

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
			<AllAttributes metricName={mockMetricName} attributes={mockAttributes} />,
		);

		expect(screen.getByText('All Attributes')).toBeInTheDocument();
	});

	it('renders all attribute keys and values', () => {
		render(
			<AllAttributes metricName={mockMetricName} attributes={mockAttributes} />,
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
			<AllAttributes metricName={mockMetricName} attributes={mockAttributes} />,
		);

		expect(screen.getByText('2')).toBeInTheDocument(); // For attribute1
		expect(screen.getByText('1')).toBeInTheDocument(); // For attribute2
	});

	it('handles empty attributes array', () => {
		render(<AllAttributes metricName={mockMetricName} attributes={[]} />);

		expect(screen.getByText('All Attributes')).toBeInTheDocument();
		expect(screen.queryByText('No data')).toBeInTheDocument();
	});

	it('clicking on an attribute value opens the explorer with the attribute filter applied', () => {
		render(
			<AllAttributes metricName={mockMetricName} attributes={mockAttributes} />,
		);
		fireEvent.click(screen.getByText('value1'));
		expect(mockHandleExplorerTabChange).toHaveBeenCalled();
	});
});
