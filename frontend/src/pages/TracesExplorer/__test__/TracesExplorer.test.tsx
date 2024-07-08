import { render } from 'tests/test-utils';

import TracesExplorer from '..';
import { Filter } from '../Filter/Filter';

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};

	const uplotMock = jest.fn(() => ({
		paths,
	}));

	return {
		paths,
		default: uplotMock,
	};
});

describe('TracesExplorer - ', () => {
	// Initial filter panel rendering
	// Test the initial state like which filters section are opened, default state of duration slider, etc.
	it('should render the Trace filter', async () => {
		const { getByText } = render(<Filter setOpen={jest.fn()} />);

		[
			'Duration',
			'Status',
			'Service Name',
			'Operation / Name',
			'RPC Method',
		].forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});
	});

	it('should clear filter on clear & reset button click', async () => {
		const { getByText, getByTestId } = render(
			<QueryBuilderContext.Provider
				value={
					{
						currentQuery: {
							...initialQueriesMap.traces,
							builder: {
								...initialQueriesMap.traces.builder,
								queryData: [initialQueryBuilderFormValues],
							},
						},
						redirectWithQueryBuilderData,
					} as any
				}
			>
				<Filter setOpen={jest.fn()} />
			</QueryBuilderContext.Provider>,
		);

		// check for the status section content
		await checkForSectionContent(['Ok', 'Error']);

		// check for the service name section content from API response
		await checkForSectionContent([
			'customer',
			'demo-app',
			'driver',
			'frontend',
			'mysql',
			'redis',
			'route',
			'go-grpc-otel-server',
			'test',
		]);

		const okCheckbox = getByText('Ok');
		fireEvent.click(okCheckbox);

		const frontendCheckbox = getByText('frontend');
		fireEvent.click(frontendCheckbox);

		// check if checked and present in query
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: {
						id: expect.any(String),
						key: 'hasError',
						type: 'tag',
						dataType: 'bool',
						isColumn: true,
						isJSON: false,
					},
					op: 'in',
					value: ['false'],
				}),
				expect.objectContaining({
					key: {
						key: 'serviceName',
						dataType: 'string',
						type: 'tag',
						isColumn: true,
						isJSON: false,
						id: expect.any(String),
					},
					op: 'in',
					value: ['frontend'],
				}),
			]),
		);

		const clearButton = getByTestId('collapse-serviceName-clearBtn');
		expect(clearButton).toBeInTheDocument();
		fireEvent.click(clearButton);

		// check if cleared and not present in query
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					key: {
						key: 'serviceName',
						dataType: 'string',
						type: 'tag',
						isColumn: true,
						isJSON: false,
						id: expect.any(String),
					},
					op: 'in',
					value: ['frontend'],
				}),
			]),
		);

		// check if reset button is present
		const resetButton = getByTestId('reset-filters');
		expect(resetButton).toBeInTheDocument();
		fireEvent.click(resetButton);

		// check if reset id done
		expect(
			redirectWithQueryBuilderData.mock.calls[
				redirectWithQueryBuilderData.mock.calls.length - 1
			][0].builder.queryData[0].filters.items,
		).toEqual([]);
	});

	it('filter panel should collapse & uncollapsed', async () => {
		const { getByText, getByTestId } = render(<TracesExplorer />);

		Object.values(AllTraceFilterKeyValue).forEach((filter) => {
			expect(getByText(filter)).toBeInTheDocument();
		});

		// Filter panel should collapse
		const collapseButton = getByTestId('toggle-filter-panel');
		expect(collapseButton).toBeInTheDocument();
		fireEvent.click(collapseButton);

		// uncollapse btn should be present
		expect(
			await screen.findByTestId('filter-uncollapse-btn'),
		).toBeInTheDocument();
	});
});
