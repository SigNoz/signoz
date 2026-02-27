import * as reactUseHooks from 'react-use';
import { render, screen } from '@testing-library/react';
import * as metricsExplorerHooks from 'api/generated/services/metrics';
import { MetrictypesTypeDTO } from 'api/generated/services/sigNoz.schemas';
import * as useHandleExplorerTabChange from 'hooks/useHandleExplorerTabChange';
import { userEvent } from 'tests/test-utils';

import ROUTES from '../../../../constants/routes';
import AllAttributes, { AllAttributesValue } from '../AllAttributes';
import { getMockMetricAttributesData, MOCK_METRIC_NAME } from './testUtlls';

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

const mockUseCopyToClipboard = jest.fn();
jest
	.spyOn(reactUseHooks, 'useCopyToClipboard')
	.mockReturnValue([{ value: 'value1' }, mockUseCopyToClipboard] as any);

const useGetMetricAttributesMock = jest.spyOn(
	metricsExplorerHooks,
	'useGetMetricAttributes',
);

describe('AllAttributes', () => {
	beforeEach(() => {
		useGetMetricAttributesMock.mockReturnValue({
			...getMockMetricAttributesData(),
		});
	});

	it('renders attributes section with title', () => {
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);

		expect(screen.getByText('All Attributes')).toBeInTheDocument();
	});

	it('renders all attribute keys and values', () => {
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
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
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);

		expect(screen.getByText('2')).toBeInTheDocument(); // For attribute1
		expect(screen.getByText('1')).toBeInTheDocument(); // For attribute2
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

	it('clicking on an attribute key opens the explorer with the attribute filter applied', async () => {
		render(
			<AllAttributes
				metricName={MOCK_METRIC_NAME}
				metricType={MetrictypesTypeDTO.gauge}
			/>,
		);
		await userEvent.click(screen.getByText('attribute1'));
		expect(mockHandleExplorerTabChange).toHaveBeenCalled();
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

	it('loads more attributes when show more button is clicked', async () => {
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
		await userEvent.click(screen.getByText('Show More'));
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

	it('copy button should copy the attribute value to the clipboard', async () => {
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
		await userEvent.click(screen.getByText('value1'));
		expect(screen.getByText('Copy Attribute')).toBeInTheDocument();
		await userEvent.click(screen.getByText('Copy Attribute'));
		expect(mockUseCopyToClipboard).toHaveBeenCalledWith('value1');
	});

	it('explorer button should go to metrics explore with the attribute filter applied', async () => {
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
		await userEvent.click(screen.getByText('value1'));

		expect(screen.getByText('Open in Explorer')).toBeInTheDocument();
		await userEvent.click(screen.getByText('Open in Explorer'));
		expect(mockGoToMetricsExploreWithAppliedAttribute).toHaveBeenCalledWith(
			'attribute1',
			'value1',
		);
	});
});
