import { fireEvent, render, screen } from '@testing-library/react';
import { getFormattedEndPointDropDownData } from 'container/ApiMonitoring/utils';

import EndPointsDropDown from '../Explorer/Domains/DomainDetails/components/EndPointsDropDown';
import { SPAN_ATTRIBUTES } from '../Explorer/Domains/DomainDetails/constants';

// Mock the Select component from antd
jest.mock('antd', () => {
	const originalModule = jest.requireActual('antd');
	return {
		...originalModule,
		Select: jest
			.fn()
			.mockImplementation(({ value, loading, onChange, options, onClear }) => (
				<div data-testid="mock-select">
					<div data-testid="select-value">{value}</div>
					<div data-testid="select-loading">
						{loading ? 'loading' : 'not-loading'}
					</div>
					<select
						data-testid="select-element"
						value={value || ''}
						onChange={(e): void => onChange(e.target.value)}
					>
						<option value="">Select...</option>
						{options?.map((option: { value: string; label: string; key: string }) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<button data-testid="select-clear-button" type="button" onClick={onClear}>
						Clear
					</button>
				</div>
			)),
	};
});

// Mock the utilities
jest.mock('container/ApiMonitoring/utils', () => ({
	getFormattedEndPointDropDownData: jest.fn(),
}));

describe('EndPointsDropDown Component', () => {
	const mockEndPoints = [
		// eslint-disable-next-line sonarjs/no-duplicate-string
		{ key: '1', value: '/api/endpoint1', label: '/api/endpoint1' },
		// eslint-disable-next-line sonarjs/no-duplicate-string
		{ key: '2', value: '/api/endpoint2', label: '/api/endpoint2' },
	];

	const mockSetSelectedEndPointName = jest.fn();

	// Create a mock that satisfies the UseQueryResult interface
	const createMockQueryResult = (overrides: any = {}): any => ({
		data: {
			payload: {
				data: {
					result: [
						{
							table: {
								rows: [],
							},
						},
					],
				},
			},
		},
		dataUpdatedAt: 0,
		error: null,
		errorUpdatedAt: 0,
		failureCount: 0,
		isError: false,
		isFetched: true,
		isFetchedAfterMount: true,
		isFetching: false,
		isIdle: false,
		isLoading: false,
		isLoadingError: false,
		isPlaceholderData: false,
		isPreviousData: false,
		isRefetchError: false,
		isRefetching: false,
		isStale: false,
		isSuccess: true,
		refetch: jest.fn(),
		remove: jest.fn(),
		status: 'success',
		...overrides,
	});

	const defaultProps = {
		selectedEndPointName: '',
		setSelectedEndPointName: mockSetSelectedEndPointName,
		endPointDropDownDataQuery: createMockQueryResult(),
	};

	beforeEach(() => {
		jest.clearAllMocks();
		(getFormattedEndPointDropDownData as jest.Mock).mockReturnValue(
			mockEndPoints,
		);
	});

	it('renders the component correctly', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointsDropDown {...defaultProps} />);

		expect(screen.getByTestId('mock-select')).toBeInTheDocument();
		// eslint-disable-next-line sonarjs/no-duplicate-string
		expect(screen.getByTestId('select-loading')).toHaveTextContent('not-loading');
	});

	it('shows loading state when data is loading', () => {
		const loadingProps = {
			...defaultProps,
			endPointDropDownDataQuery: createMockQueryResult({
				isLoading: true,
			}),
		};

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointsDropDown {...loadingProps} />);

		expect(screen.getByTestId('select-loading')).toHaveTextContent('loading');
	});

	it('shows loading state when data is fetching', () => {
		const fetchingProps = {
			...defaultProps,
			endPointDropDownDataQuery: createMockQueryResult({
				isFetching: true,
			}),
		};

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointsDropDown {...fetchingProps} />);

		expect(screen.getByTestId('select-loading')).toHaveTextContent('loading');
	});

	it('displays the selected endpoint', () => {
		const selectedProps = {
			...defaultProps,
			selectedEndPointName: '/api/endpoint1',
		};

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointsDropDown {...selectedProps} />);

		expect(screen.getByTestId('select-value')).toHaveTextContent(
			'/api/endpoint1',
		);
	});

	it('calls setSelectedEndPointName when an option is selected', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointsDropDown {...defaultProps} />);

		// Get the select element and change its value
		const selectElement = screen.getByTestId('select-element');
		fireEvent.change(selectElement, { target: { value: '/api/endpoint2' } });

		expect(mockSetSelectedEndPointName).toHaveBeenCalledWith('/api/endpoint2');
	});

	it('calls setSelectedEndPointName with empty string when cleared', () => {
		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointsDropDown {...defaultProps} />);

		// Click the clear button
		const clearButton = screen.getByTestId('select-clear-button');
		fireEvent.click(clearButton);

		expect(mockSetSelectedEndPointName).toHaveBeenCalledWith('');
	});

	it('passes dropdown style prop correctly', () => {
		const styleProps = {
			...defaultProps,
			dropdownStyle: { maxHeight: '200px' },
		};

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointsDropDown {...styleProps} />);

		// We can't easily test style props in our mock, but at least ensure the component rendered
		expect(screen.getByTestId('mock-select')).toBeInTheDocument();
	});

	it('formats data using the utility function', () => {
		const mockRows = [
			{ data: { [SPAN_ATTRIBUTES.URL_PATH]: '/api/test', A: 10 } },
		];

		const dataProps = {
			...defaultProps,
			endPointDropDownDataQuery: createMockQueryResult({
				data: {
					payload: {
						data: {
							result: [
								{
									table: {
										rows: mockRows,
									},
								},
							],
						},
					},
				},
			}),
		};

		// eslint-disable-next-line react/jsx-props-no-spreading
		render(<EndPointsDropDown {...dataProps} />);

		expect(getFormattedEndPointDropDownData).toHaveBeenCalledWith(mockRows);
	});
});
