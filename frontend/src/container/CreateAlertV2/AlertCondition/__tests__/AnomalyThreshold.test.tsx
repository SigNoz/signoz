import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';
import { render, screen, userEvent, within } from 'tests/test-utils';
import { Channels } from 'types/api/channels/getAll';

import * as context from '../../context';
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

const mockSetAlertState = jest.fn();
const mockSetThresholdState = jest.fn();
const mockContextState = createMockAlertContextState({
	setThresholdState: mockSetThresholdState,
	setAlertState: mockSetAlertState,
});
const useCreateAlertStateSpy = jest.spyOn(context, 'useCreateAlertState');

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

const channels = [{ id: '1', name: 'slack-alerts' }] as Channels[];

const renderAnomalyThreshold = (): ReturnType<typeof render> =>
	render(
		<AnomalyThreshold
			channels={channels}
			isLoadingChannels={false}
			isErrorChannels={false}
			refreshChannels={jest.fn()}
		/>,
	);

describe('AnomalyThreshold', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useCreateAlertStateSpy.mockReturnValue(mockContextState);
	});

	const pickOption = async (testId: string, title: string): Promise<void> => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		await user.click(within(screen.getByTestId(testId)).getByRole('combobox'));
		await user.click(await screen.findByTitle(title));
	};

	it('renders the first condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByTestId('notification-text')).toBeInTheDocument();
		expect(screen.getByTestId('evaluation-window-text')).toBeInTheDocument();
		expect(screen.getByTestId('evaluation-window-select')).toBeInTheDocument();
	});

	it('renders the second condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByTestId('threshold-text')).toBeInTheDocument();
		expect(screen.getByTestId('threshold-value-select')).toBeInTheDocument();
		expect(screen.getByTestId('deviations-text')).toBeInTheDocument();
		expect(screen.getByTestId('operator-select')).toBeInTheDocument();
		expect(screen.getByTestId('predicted-data-text')).toBeInTheDocument();
		expect(screen.getByTestId('match-type-select')).toBeInTheDocument();
	});

	it('renders the third condition sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByTestId('using-the-text')).toBeInTheDocument();
		expect(screen.getByTestId('algorithm-select')).toBeInTheDocument();
		expect(screen.getByTestId('algorithm-with-text')).toBeInTheDocument();
		expect(screen.getByTestId('seasonality-select')).toBeInTheDocument();
		expect(screen.getByTestId('seasonality-text')).toBeInTheDocument();
	});

	it('stores the picked deviation as a number', async () => {
		renderAnomalyThreshold();
		await pickOption('threshold-value-select', '4');
		expect(mockSetThresholdState).toHaveBeenCalledWith({
			type: 'SET_THRESHOLDS',
			payload: [expect.objectContaining({ thresholdValue: 4 })],
		});
	});

	it('picks channels by name when routing policies are off', async () => {
		renderAnomalyThreshold();
		await pickOption('anomaly-notification-channel-select', 'slack-alerts');
		expect(mockSetThresholdState).toHaveBeenCalledWith({
			type: 'SET_THRESHOLDS',
			payload: [expect.objectContaining({ channels: ['slack-alerts'] })],
		});
	});

	it('hides the channel picker when routing policies are on', () => {
		useCreateAlertStateSpy.mockReturnValue({
			...mockContextState,
			notificationSettings: {
				...mockContextState.notificationSettings,
				routingPolicies: true,
			},
		});
		renderAnomalyThreshold();
		expect(
			screen.queryByTestId('anomaly-notification-channel-select'),
		).not.toBeInTheDocument();
	});
});
