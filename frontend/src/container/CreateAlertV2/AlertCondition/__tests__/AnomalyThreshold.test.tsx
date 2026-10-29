import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';
import { render, screen, userEvent, within } from 'tests/test-utils';
import { ChannelOption } from 'hooks/notificationChannels/useChannelOptions';

import * as context from '../../context';
import { AlertThresholdMatchType } from '../../context/types';
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

const channels: ChannelOption[] = [{ id: '1', name: 'slack-alerts' }];

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

	it('renders the condition sentence in the same order as threshold alerts', () => {
		renderAnomalyThreshold();
		expect(screen.getByTestId('notification-text')).toHaveTextContent(
			'Send a notification when',
		);
		expect(screen.getByTestId('query-select')).toBeInTheDocument();
		expect(screen.getByTestId('operator-select')).toBeInTheDocument();
		expect(screen.getByTestId('predicted-data-text')).toHaveTextContent(
			'the prediction',
		);
		expect(screen.getByTestId('match-type-select')).toBeInTheDocument();
		expect(screen.getByTestId('evaluation-settings-button')).toHaveTextContent(
			'Rolling',
		);
	});

	it('renders the algorithm and seasonality sentence', () => {
		renderAnomalyThreshold();
		expect(screen.getByTestId('algorithm-select')).toBeInTheDocument();
		expect(screen.getByTestId('seasonality-select')).toBeInTheDocument();
		expect(screen.getByTestId('seasonality-text')).toHaveTextContent(
			'seasonality',
		);
	});

	it('renames the severity from its threshold row', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderAnomalyThreshold();
		await user.type(screen.getByTestId('threshold-name-input'), 'x');
		expect(mockSetThresholdState).toHaveBeenCalledWith({
			type: 'SET_THRESHOLDS',
			payload: [expect.objectContaining({ label: 'criticalx' })],
		});
	});

	it('takes a typed deviation', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		useCreateAlertStateSpy.mockReturnValue({
			...mockContextState,
			thresholdState: {
				...mockContextState.thresholdState,
				thresholds: [
					{
						...mockContextState.thresholdState.thresholds[0],
						thresholdValue: '' as unknown as number,
					},
				],
			},
		});
		renderAnomalyThreshold();
		await user.type(screen.getByTestId('threshold-value-input'), '4');
		expect(mockSetThresholdState).toHaveBeenCalledWith({
			type: 'SET_THRESHOLDS',
			payload: [expect.objectContaining({ thresholdValue: '4' })],
		});
	});

	it.each([
		['ON AVERAGE', AlertThresholdMatchType.ON_AVERAGE],
		['LAST', AlertThresholdMatchType.LAST],
	])('offers the %s match type', async (title, matchType) => {
		renderAnomalyThreshold();
		await pickOption('match-type-select', title);
		expect(mockSetThresholdState).toHaveBeenCalledWith({
			type: 'SET_MATCH_TYPE',
			payload: matchType,
		});
	});

	it('picks channels by name when routing policies are off', async () => {
		renderAnomalyThreshold();
		await pickOption('threshold-notification-channel-select', 'slack-alerts');
		expect(mockSetThresholdState).toHaveBeenCalledWith({
			type: 'SET_THRESHOLDS',
			payload: [expect.objectContaining({ channels: ['slack-alerts'] })],
		});
	});

	it('adds the next severity one deviation lower', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		renderAnomalyThreshold();
		await user.click(screen.getByTestId('add-threshold-button'));
		expect(mockSetThresholdState).toHaveBeenCalledWith({
			type: 'SET_THRESHOLDS',
			payload: [
				mockContextState.thresholdState.thresholds[0],
				expect.objectContaining({ label: 'warning', thresholdValue: 2 }),
			],
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
			screen.queryByTestId('threshold-notification-channel-select'),
		).not.toBeInTheDocument();
	});
});
