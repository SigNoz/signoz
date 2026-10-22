import { QueryClient, QueryClientProvider } from 'react-query';
import { MemoryRouter, useHistory } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import { INITIAL_CREATE_ALERT_STATE } from '../constants';
import { CreateAlertProvider, useCreateAlertState } from '../index';
import { AlertThresholdMatchType } from '../types';

// The provider only needs a query with a unit + empty builder for these assertions.
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: (): unknown => ({
		currentQuery: {
			unit: 'bytes',
			builder: { queryData: [], queryFormulas: [] },
		},
		redirectWithQueryBuilderData: jest.fn(),
	}),
}));

const mutation = { mutate: jest.fn(), isLoading: false };
jest.mock('api/generated/services/rules', () => ({
	useCreateRule: (): unknown => mutation,
	useTestRule: (): unknown => mutation,
	useUpdateRuleByID: (): unknown => mutation,
}));

function Probe(): JSX.Element {
	const { thresholdState, evaluationWindow } = useCreateAlertState();
	return (
		<div>
			<span data-testid="match-type">{thresholdState.matchType}</span>
			<span data-testid="operator">{thresholdState.operator}</span>
			<span data-testid="threshold-count">{thresholdState.thresholds.length}</span>
			<span data-testid="threshold-value">
				{thresholdState.thresholds[0]?.thresholdValue}
			</span>
			<span data-testid="window-type">{evaluationWindow.windowType}</span>
		</div>
	);
}

function renderWithSearch(search: string): void {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<MemoryRouter initialEntries={[`/alerts/new${search}`]}>
			<QueryClientProvider client={queryClient}>
				<CreateAlertProvider initialAlertType={AlertTypes.METRICS_BASED_ALERT}>
					<Probe />
				</CreateAlertProvider>
			</QueryClientProvider>
		</MemoryRouter>,
	);
}

function serializeThreshold(thresholdValue: number): string {
	return encodeURIComponent(
		JSON.stringify([
			{
				id: 't1',
				label: 'critical',
				thresholdValue,
				recoveryThresholdValue: null,
				unit: 'bytes',
				channels: [],
				color: '#F1575F',
			},
		]),
	);
}

describe('CreateAlertProvider — URL-declared prefill (issue #5291)', () => {
	it('applies matchType, operator, and thresholds without the meter window', () => {
		// Dashboard-style prefill: no evaluationWindowPreset → default window.
		renderWithSearch(
			`?matchType=on_average&compareOp=below&thresholds=${serializeThreshold(90)}`,
		);

		expect(screen.getByTestId('match-type')).toHaveTextContent('on_average');
		expect(screen.getByTestId('operator')).toHaveTextContent('below');
		expect(screen.getByTestId('threshold-count')).toHaveTextContent('1');
		expect(screen.getByTestId('threshold-value')).toHaveTextContent('90');
		// The meter evaluation-window preset must NOT fire.
		expect(screen.getByTestId('window-type')).toHaveTextContent('rolling');
	});

	it('adjusts only the occurrence type when no thresholds are supplied', () => {
		renderWithSearch(`?matchType=in_total`);

		expect(screen.getByTestId('match-type')).toHaveTextContent('in_total');
		// The default single critical threshold and operator are retained.
		expect(screen.getByTestId('threshold-count')).toHaveTextContent('1');
		expect(screen.getByTestId('threshold-value')).toHaveTextContent('0');
		expect(screen.getByTestId('operator')).toHaveTextContent('above');
		expect(screen.getByTestId('window-type')).toHaveTextContent('rolling');
	});

	it('applies the meter evaluation window when the preset is declared', () => {
		// Ingestion-style prefill: explicit in_total + meter preset.
		renderWithSearch(
			`?matchType=in_total&evaluationWindowPreset=meter&thresholds=${serializeThreshold(
				500,
			)}`,
		);

		expect(screen.getByTestId('match-type')).toHaveTextContent('in_total');
		expect(screen.getByTestId('threshold-value')).toHaveTextContent('500');
		expect(screen.getByTestId('window-type')).toHaveTextContent('cumulative');
	});
});

// Reproduces the #12137 regression: on the alert overview page the query builder
// rewrites location.search after the alert loads, which used to re-run the prefill
// effect and RESET the loaded threshold back to 0.
function SearchMutator(): JSX.Element {
	const routerHistory = useHistory();
	return (
		<button
			type="button"
			data-testid="mutate-search"
			onClick={(): void =>
				routerHistory.replace(
					'/alerts/overview?compositeQuery=normalized&ruleId=r1',
				)
			}
		>
			change search
		</button>
	);
}

describe('CreateAlertProvider — edit mode ignores URL prefill', () => {
	it('keeps loaded thresholds when the query builder rewrites location.search', () => {
		const initialAlertState = {
			...INITIAL_CREATE_ALERT_STATE,
			threshold: {
				...INITIAL_CREATE_ALERT_STATE.threshold,
				matchType: AlertThresholdMatchType.AT_LEAST_ONCE,
				thresholds: [
					{
						...INITIAL_CREATE_ALERT_STATE.threshold.thresholds[0],
						thresholdValue: 245,
					},
				],
			},
		};

		const queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		render(
			<MemoryRouter initialEntries={['/alerts/overview?ruleId=r1']}>
				<QueryClientProvider client={queryClient}>
					<CreateAlertProvider
						initialAlertType={AlertTypes.METRICS_BASED_ALERT}
						isEditMode
						ruleId="r1"
						initialAlertState={initialAlertState}
					>
						<Probe />
						<SearchMutator />
					</CreateAlertProvider>
				</QueryClientProvider>
			</MemoryRouter>,
		);

		expect(screen.getByTestId('threshold-value')).toHaveTextContent('245');

		// Simulate the query builder normalizing the query into the URL post-load.
		fireEvent.click(screen.getByTestId('mutate-search'));

		expect(screen.getByTestId('threshold-value')).toHaveTextContent('245');
	});
});
