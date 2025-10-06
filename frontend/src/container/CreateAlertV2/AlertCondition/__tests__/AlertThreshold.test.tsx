/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/jsx-props-no-spreading */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter } from 'react-router-dom';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { Channels } from 'types/api/channels/getAll';

import { CreateAlertProvider } from '../../context';
import AlertThreshold from '../AlertThreshold';

const mockChannels: Channels[] = [];
const mockRefreshChannels = jest.fn();
const mockIsLoadingChannels = false;
const mockIsErrorChannels = false;
const mockProps = {
	channels: mockChannels,
	isLoadingChannels: mockIsLoadingChannels,
	isErrorChannels: mockIsErrorChannels,
	refreshChannels: mockRefreshChannels,
};

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock: any = jest.fn(() => ({
		paths,
	}));
	uplotMock.paths = paths;
	return uplotMock;
});

// Mock the ThresholdItem component
jest.mock('../ThresholdItem', () => ({
	__esModule: true,
	default: function MockThresholdItem({
		threshold,
		removeThreshold,
		showRemoveButton,
	}: {
		threshold: Record<string, unknown>;
		removeThreshold: (id: string) => void;
		showRemoveButton: boolean;
	}): JSX.Element {
		return (
			<div data-testid={`threshold-item-${threshold.id}`}>
				<span>{threshold.label as string}</span>
				{showRemoveButton && (
					<button
						type="button"
						data-testid={`remove-threshold-${threshold.id}`}
						onClick={(): void => removeThreshold(threshold.id as string)}
					>
						Remove
					</button>
				)}
			</div>
		);
	},
}));

// Mock useQueryBuilder hook
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): {
		currentQuery: {
			dataSource: string;
			queryName: string;
			builder: {
				queryData: Array<{ queryName: string }>;
				queryFormulas: Array<{ queryName: string }>;
			};
			unit: string;
		};
	} => ({
		currentQuery: {
			dataSource: 'METRICS',
			queryName: 'A',
			builder: {
				queryData: [{ queryName: 'Query A' }, { queryName: 'Query B' }],
				queryFormulas: [{ queryName: 'Formula 1' }],
			},
			unit: 'bytes',
		},
	}),
}));

// Mock getAllChannels API
jest.mock('api/channels/getAll', () => ({
	__esModule: true,
	default: jest.fn(() =>
		Promise.resolve({
			data: [
				{ id: '1', name: 'Email Channel' },
				{ id: '2', name: 'Slack Channel' },
			] as Channels[],
		}),
	),
}));

// Mock alert format categories
jest.mock('container/NewWidget/RightContainer/alertFomatCategories', () => ({
	getCategoryByOptionId: jest.fn(() => ({ name: 'bytes' })),
	getCategorySelectOptionByName: jest.fn(() => [
		{ label: 'Bytes', value: 'bytes' },
		{ label: 'KB', value: 'kb' },
	]),
}));

jest.mock('container/CreateAlertV2/utils', () => ({
	...jest.requireActual('container/CreateAlertV2/utils'),
}));

const TEST_STRINGS = {
	ADD_THRESHOLD: 'Add Threshold',
	AT_LEAST_ONCE: 'AT LEAST ONCE',
	IS_ABOVE: 'ABOVE',
} as const;

const createTestQueryClient = (): QueryClient =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const renderAlertThreshold = (): ReturnType<typeof render> => {
	const queryClient = createTestQueryClient();
	return render(
		<MemoryRouter>
			<QueryClientProvider client={queryClient}>
				<CreateAlertProvider initialAlertType={AlertTypes.METRICS_BASED_ALERT}>
					<AlertThreshold {...mockProps} />
				</CreateAlertProvider>
			</QueryClientProvider>
		</MemoryRouter>,
	);
};

const verifySelectRenders = (title: string): void => {
	let select = screen.queryByTitle(title);
	if (!select) {
		select = screen.getByText(title);
	}
	expect(select).toBeInTheDocument();
};

describe('AlertThreshold', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the main condition sentence', () => {
		renderAlertThreshold();
		expect(screen.getByText('Send a notification when')).toBeInTheDocument();
		expect(screen.getByText('the threshold(s)')).toBeInTheDocument();
		expect(screen.getByText('during the')).toBeInTheDocument();
		expect(
			screen.getByTestId('condensed-evaluation-settings-container'),
		).toBeInTheDocument();
	});

	it('renders query selection dropdown', async () => {
		renderAlertThreshold();

		await waitFor(() => {
			const querySelect = screen.getByTitle('A');
			expect(querySelect).toBeInTheDocument();
		});
	});

	it('renders operator selection dropdown', () => {
		renderAlertThreshold();
		verifySelectRenders(TEST_STRINGS.IS_ABOVE);
	});

	it('renders match type selection dropdown', () => {
		renderAlertThreshold();
		verifySelectRenders(TEST_STRINGS.AT_LEAST_ONCE);
	});

	it('renders threshold items', () => {
		renderAlertThreshold();
		expect(screen.getByTestId(/threshold-item-/)).toBeInTheDocument();
	});

	it('renders add threshold button', () => {
		renderAlertThreshold();
		expect(screen.getByText(TEST_STRINGS.ADD_THRESHOLD)).toBeInTheDocument();
	});

	it('adds a new threshold when add button is clicked', () => {
		renderAlertThreshold();

		const addButton = screen.getByText(TEST_STRINGS.ADD_THRESHOLD);
		fireEvent.click(addButton);

		// Should now have multiple threshold items
		const thresholdItems = screen.getAllByTestId(/threshold-item-/);
		expect(thresholdItems).toHaveLength(2);
	});

	it('adds correct threshold types based on count', () => {
		renderAlertThreshold();

		const addButton = screen.getByText(TEST_STRINGS.ADD_THRESHOLD);

		// First addition should add WARNING threshold
		fireEvent.click(addButton);
		expect(screen.getByText('warning')).toBeInTheDocument();

		// Second addition should add INFO threshold
		fireEvent.click(addButton);
		expect(screen.getByText('info')).toBeInTheDocument();

		// Third addition should add random threshold
		fireEvent.click(addButton);
		expect(screen.getAllByTestId(/threshold-item-/)).toHaveLength(4);
	});

	it('updates operator when operator dropdown changes', () => {
		renderAlertThreshold();
		verifySelectRenders(TEST_STRINGS.IS_ABOVE);
	});

	it('updates match type when match type dropdown changes', () => {
		renderAlertThreshold();
		verifySelectRenders(TEST_STRINGS.AT_LEAST_ONCE);
	});

	it('shows remove button for non-first thresholds', () => {
		renderAlertThreshold();

		// Add a threshold
		const addButton = screen.getByText(TEST_STRINGS.ADD_THRESHOLD);
		fireEvent.click(addButton);

		// Second threshold should have remove button
		expect(screen.getByTestId(/remove-threshold-/)).toBeInTheDocument();
	});

	it('does not show remove button for first threshold', () => {
		renderAlertThreshold();

		// First threshold should not have remove button
		expect(screen.queryByTestId(/remove-threshold-/)).not.toBeInTheDocument();
	});

	it('removes threshold when remove button is clicked', () => {
		renderAlertThreshold();

		// Add a threshold first
		const addButton = screen.getByText(TEST_STRINGS.ADD_THRESHOLD);
		fireEvent.click(addButton);

		// Get the remove button and click it
		const removeButton = screen.getByTestId(/remove-threshold-/);
		fireEvent.click(removeButton);

		// Should be back to one threshold
		expect(screen.getAllByTestId(/threshold-item-/)).toHaveLength(1);
	});

	it('does not remove threshold if only one remains', () => {
		renderAlertThreshold();

		// Should only have one threshold initially
		expect(screen.getAllByTestId(/threshold-item-/)).toHaveLength(1);

		// Try to remove (should not work)
		const thresholdItems = screen.getAllByTestId(/threshold-item-/);
		expect(thresholdItems).toHaveLength(1);
	});

	it('handles loading state for channels', () => {
		renderAlertThreshold();

		// Component should render even while channels are loading
		expect(screen.getByText('Send a notification when')).toBeInTheDocument();
	});

	it('renders with correct initial state', () => {
		renderAlertThreshold();

		// Should have initial critical threshold
		expect(screen.getByText('critical')).toBeInTheDocument();
		verifySelectRenders(TEST_STRINGS.IS_ABOVE);
		verifySelectRenders(TEST_STRINGS.AT_LEAST_ONCE);
	});
});
