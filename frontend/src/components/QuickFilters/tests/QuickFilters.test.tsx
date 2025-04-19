import '@testing-library/jest-dom';

import { fireEvent, render, screen } from '@testing-library/react';
import { useGetAggregateValues } from 'hooks/queryBuilder/useGetAggregateValues';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';

import QuickFilters from '../QuickFilters';
import { QuickFiltersSource } from '../types';
import { QuickFiltersConfig } from './constants';

// Mock the useQueryBuilder hook
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
// Mock the useGetAggregateValues hook
jest.mock('hooks/queryBuilder/useGetAggregateValues', () => ({
	useGetAggregateValues: jest.fn(),
}));

const handleFilterVisibilityChange = jest.fn();
const redirectWithQueryBuilderData = jest.fn();

function TestQuickFilters(): JSX.Element {
	return (
		<MockQueryClientProvider>
			<QuickFilters
				source={QuickFiltersSource.EXCEPTIONS}
				config={QuickFiltersConfig}
				handleFilterVisibilityChange={handleFilterVisibilityChange}
			/>
		</MockQueryClientProvider>
	);
}

describe('Quick Filters', () => {
	beforeEach(() => {
		// Provide a mock implementation for useQueryBuilder
		(useQueryBuilder as jest.Mock).mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: 'Test Query',
							filters: { items: [{ key: 'test', value: 'value' }] },
						},
					],
				},
			},
			lastUsedQuery: 0,
			redirectWithQueryBuilderData,
		});

		// Provide a mock implementation for useGetAggregateValues
		(useGetAggregateValues as jest.Mock).mockReturnValue({
			data: {
				statusCode: 200,
				error: null,
				message: 'success',
				payload: {
					stringAttributeValues: [
						'mq-kafka',
						'otel-demo',
						'otlp-python',
						'sample-flask',
					],
					numberAttributeValues: null,
					boolAttributeValues: null,
				},
			}, // Mocked API response
			isLoading: false,
		});
	});

	it('renders correctly with default props', () => {
		const { container } = render(<TestQuickFilters />);
		expect(container).toMatchSnapshot();
	});

	it('displays the correct query name in the header', () => {
		render(<TestQuickFilters />);
		expect(screen.getByText('Filters for')).toBeInTheDocument();
		expect(screen.getByText('Test Query')).toBeInTheDocument();
	});

	it('should add filter data to query when checkbox is clicked', () => {
		render(<TestQuickFilters />);
		const checkbox = screen.getByText('mq-kafka');
		fireEvent.click(checkbox);
		expect(redirectWithQueryBuilderData).toHaveBeenCalledWith(
			expect.objectContaining({
				builder: {
					queryData: expect.arrayContaining([
						expect.objectContaining({
							filters: expect.objectContaining({
								items: expect.arrayContaining([
									expect.objectContaining({
										key: expect.objectContaining({
											key: 'deployment.environment',
										}),
										value: 'mq-kafka',
									}),
								]),
							}),
						}),
					]),
				},
			}),
		); // sets composite query param
	});
});
