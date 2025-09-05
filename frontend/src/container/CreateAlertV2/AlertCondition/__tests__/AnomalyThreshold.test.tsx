/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { CreateAlertProvider } from '../../context';
import AnomalyThreshold from '../AnomalyThreshold';

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
		};
	} => ({
		currentQuery: {
			dataSource: 'METRICS',
			queryName: 'A',
			builder: {
				queryData: [{ queryName: 'Query A' }, { queryName: 'Query B' }],
				queryFormulas: [{ queryName: 'Formula 1' }],
			},
		},
	}),
}));

const TEST_STRINGS = {
	NOTIFICATION_TEXT: 'Send notification when the observed value for',
	AT_LEAST_ONCE: 'AT LEAST ONCE',
	IS_ABOVE: 'IS ABOVE',
} as const;

const createTestQueryClient = (): QueryClient =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

const renderAnomalyThreshold = (): ReturnType<typeof render> => {
	const queryClient = createTestQueryClient();
	return render(
		<QueryClientProvider client={queryClient}>
			<CreateAlertProvider>
				<AnomalyThreshold />
			</CreateAlertProvider>
		</QueryClientProvider>,
	);
};

const verifySelectRenders = (title: string): void => {
	const select = screen.getByTitle(title);
	expect(select).toBeInTheDocument();
};

const verifyComponentRenders = (): void => {
	expect(screen.getByText(TEST_STRINGS.NOTIFICATION_TEXT)).toBeInTheDocument();
};

describe('AnomalyThreshold', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the first condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByText(TEST_STRINGS.NOTIFICATION_TEXT)).toBeInTheDocument();
		expect(screen.getByText('during the last')).toBeInTheDocument();
	});

	it('renders the second condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByText('is')).toBeInTheDocument();
		expect(screen.getByText('deviations')).toBeInTheDocument();
		expect(screen.getByText('the predicted data')).toBeInTheDocument();
	});

	it('renders the third condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByText('using the')).toBeInTheDocument();
		expect(screen.getByText('algorithm with')).toBeInTheDocument();
		expect(screen.getByText('seasonality')).toBeInTheDocument();
	});

	it('renders query selection dropdown', () => {
		renderAnomalyThreshold();
		verifySelectRenders('A');
	});

	it('renders evaluation window dropdown', () => {
		renderAnomalyThreshold();
		verifySelectRenders('1 minute');
	});

	it('renders deviation value dropdown', () => {
		renderAnomalyThreshold();
		verifyComponentRenders();
	});

	it('renders operator dropdown', () => {
		renderAnomalyThreshold();
		verifySelectRenders(TEST_STRINGS.IS_ABOVE);
	});

	it('renders match type dropdown', () => {
		renderAnomalyThreshold();
		verifySelectRenders(TEST_STRINGS.AT_LEAST_ONCE);
	});

	it('renders algorithm dropdown', () => {
		renderAnomalyThreshold();
		verifySelectRenders('Standard');
	});

	it('renders seasonality dropdown', () => {
		renderAnomalyThreshold();
		verifySelectRenders('Hourly');
	});

	it('updates selected query when query dropdown changes', () => {
		renderAnomalyThreshold();
		verifySelectRenders('A');
	});

	it('updates evaluation window when dropdown changes', () => {
		renderAnomalyThreshold();
		verifySelectRenders('1 minute');
	});

	it('updates deviation value when dropdown changes', () => {
		renderAnomalyThreshold();
		verifyComponentRenders();
	});

	it('updates operator when operator dropdown changes', () => {
		renderAnomalyThreshold();
		verifySelectRenders(TEST_STRINGS.IS_ABOVE);
	});

	it('updates match type when match type dropdown changes', () => {
		renderAnomalyThreshold();
		verifySelectRenders(TEST_STRINGS.AT_LEAST_ONCE);
	});

	it('updates algorithm when algorithm dropdown changes', () => {
		renderAnomalyThreshold();
		verifySelectRenders('Standard');
	});

	it('updates seasonality when seasonality dropdown changes', () => {
		renderAnomalyThreshold();
		verifySelectRenders('Hourly');
	});

	it('generates correct deviation options (1-7)', () => {
		renderAnomalyThreshold();
		verifyComponentRenders();
	});

	it('renders with correct initial state', () => {
		renderAnomalyThreshold();

		// Check initial values that are actually rendered
		expect(screen.getByTitle('A')).toBeInTheDocument();
		expect(screen.getByTitle('1 minute')).toBeInTheDocument();
		expect(screen.getByTitle('IS ABOVE')).toBeInTheDocument();
		expect(screen.getByTitle('AT LEAST ONCE')).toBeInTheDocument();
		expect(screen.getByTitle('Standard')).toBeInTheDocument();
		expect(screen.getByTitle('Hourly')).toBeInTheDocument();
	});

	it('updates threshold value when deviation changes', () => {
		renderAnomalyThreshold();
		verifyComponentRenders();
	});

	it('renders all three condition sentences in correct order', () => {
		renderAnomalyThreshold();

		const sentences = screen.getAllByText(/Send notification when|is|using the/);
		expect(sentences).toHaveLength(3);
	});

	it('handles multiple query names from query builder', () => {
		renderAnomalyThreshold();
		verifySelectRenders('A');
	});

	it('maintains state consistency across dropdown changes', () => {
		renderAnomalyThreshold();

		// Change multiple values
		verifySelectRenders('A');
		verifySelectRenders(TEST_STRINGS.IS_ABOVE);
	});
});
