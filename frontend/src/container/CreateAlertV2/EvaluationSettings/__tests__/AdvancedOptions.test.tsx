import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from 'store';

import { CreateAlertProvider } from '../../context';
import {
	INITIAL_ADVANCED_OPTIONS_STATE,
	INITIAL_EVALUATION_WINDOW_STATE,
} from '../../context/constants';
import AdvancedOptions from '../AdvancedOptions';

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

// Mock dayjs timezone
jest.mock('dayjs', () => {
	const originalDayjs = jest.requireActual('dayjs');
	const mockDayjs = jest.fn((date) => originalDayjs(date));
	Object.assign(mockDayjs, originalDayjs);
	((mockDayjs as unknown) as { tz: { guess: jest.Mock } }).tz = {
		guess: jest.fn(() => 'UTC'),
	};
	return mockDayjs;
});

// Mock Y_AXIS_CATEGORIES
jest.mock('components/YAxisUnitSelector/constants', () => ({
	Y_AXIS_CATEGORIES: [
		{
			name: 'Time',
			units: [
				{ name: 'Second', id: 's' },
				{ name: 'Minute', id: 'm' },
				{ name: 'Hour', id: 'h' },
				{ name: 'Day', id: 'd' },
			],
		},
	],
}));

// Mock the context
const mockSetAdvancedOptions = jest.fn();
jest.mock('../../context', () => ({
	...jest.requireActual('../../context'),
	useCreateAlertState: (): {
		advancedOptions: typeof INITIAL_ADVANCED_OPTIONS_STATE;
		setAdvancedOptions: jest.Mock;
		evaluationWindow: typeof INITIAL_EVALUATION_WINDOW_STATE;
		setEvaluationWindow: jest.Mock;
	} => ({
		advancedOptions: INITIAL_ADVANCED_OPTIONS_STATE,
		setAdvancedOptions: mockSetAdvancedOptions,
		evaluationWindow: INITIAL_EVALUATION_WINDOW_STATE,
		setEvaluationWindow: jest.fn(),
	}),
}));

// Mock EvaluationCadence component
jest.mock('../EvaluationCadence', () => ({
	__esModule: true,
	default: function MockEvaluationCadence(): JSX.Element {
		return (
			<div data-testid="evaluation-cadence">Evaluation Cadence Component</div>
		);
	},
}));

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: false,
		},
	},
});

const TOLERANCE_LIMIT_PLACEHOLDER = 'Enter tolerance limit...';

const renderAdvancedOptions = (): void => {
	render(
		<QueryClientProvider client={queryClient}>
			<Provider store={store}>
				<MemoryRouter>
					<CreateAlertProvider>
						<AdvancedOptions />
					</CreateAlertProvider>
				</MemoryRouter>
			</Provider>
		</QueryClientProvider>,
	);
};

describe('AdvancedOptions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	const expandAdvancedOptions = async (
		user: ReturnType<typeof userEvent.setup>,
	): Promise<void> => {
		const collapseHeader = screen.getByRole('button');
		await user.click(collapseHeader);
		await waitFor(() => {
			expect(screen.getByTestId('evaluation-cadence')).toBeInTheDocument();
		});
	};

	it('should render and allow expansion of advanced options', async () => {
		const user = userEvent.setup();
		renderAdvancedOptions();

		expect(screen.getByText('ADVANCED OPTIONS')).toBeInTheDocument();

		await expandAdvancedOptions(user);

		expect(
			screen.getByText('Send a notification if data is missing'),
		).toBeInTheDocument();
		expect(screen.getByText('Enforce minimum datapoints')).toBeInTheDocument();
		expect(screen.getByText('Delay evaluation')).toBeInTheDocument();
	});

	it('should enable advanced option inputs when switches are toggled', async () => {
		const user = userEvent.setup();
		renderAdvancedOptions();

		await expandAdvancedOptions(user);

		const switches = screen.getAllByRole('switch');

		// Toggle the first switch (send notification)
		await user.click(switches[0]);
		await waitFor(() => {
			expect(
				screen.getByPlaceholderText(TOLERANCE_LIMIT_PLACEHOLDER),
			).toBeInTheDocument();
		});

		// Toggle the second switch (minimum datapoints)
		await user.click(switches[1]);
		await waitFor(() => {
			expect(
				screen.getByPlaceholderText('Enter minimum datapoints...'),
			).toBeInTheDocument();
		});
	});

	it('should update advanced options state when user interacts with inputs', async () => {
		const user = userEvent.setup();
		renderAdvancedOptions();

		await expandAdvancedOptions(user);

		// Enable send notification option
		const switches = screen.getAllByRole('switch');
		await user.click(switches[0]);

		// Wait for tolerance input to appear and test interaction
		const toleranceInput = await screen.findByPlaceholderText(
			TOLERANCE_LIMIT_PLACEHOLDER,
		);
		await user.clear(toleranceInput);
		await user.type(toleranceInput, '10');

		const timeUnitSelect = screen.getByRole('combobox');
		await user.click(timeUnitSelect);
		await waitFor(() => {
			expect(screen.getByText('Minute')).toBeInTheDocument();
		});
		await user.click(screen.getByText('Minute'));

		// Verify that the state update function was called (testing behavior, not exact values)
		expect(mockSetAdvancedOptions).toHaveBeenCalled();

		// Verify the function was called with the expected action types
		const { calls } = mockSetAdvancedOptions.mock;
		const actionTypes = calls.map((call) => call[0].type);
		expect(actionTypes).toContain('SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING');
	});
});
