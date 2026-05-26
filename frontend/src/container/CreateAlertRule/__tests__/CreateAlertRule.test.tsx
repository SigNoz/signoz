import { fireEvent, screen } from '@testing-library/react';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import { getAppContextMockState } from 'container/RoutingPolicies/__tests__/testUtils';
import * as useCompositeQueryParamHooks from 'hooks/queryBuilder/useGetCompositeQueryParam';
import * as navigateHooks from 'hooks/useSafeNavigate';
import * as useUrlQueryHooks from 'hooks/useUrlQuery';
import * as appHooks from 'providers/App/App';
import { render } from 'tests/test-utils';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { DataSource } from 'types/common/queryBuilder';

import CreateAlertRule from '../index';

jest.mock('react-router-dom-v5-compat', () => ({
	...jest.requireActual('react-router-dom-v5-compat'),
	useNavigationType: jest.fn(() => 'PUSH'),
	useLocation: jest.fn(() => ({
		pathname: '/alerts/new',
		search: '',
		hash: '',
		state: null,
	})),
	useSearchParams: jest.fn(() => [new URLSearchParams(), jest.fn()]),
}));

jest.mock('container/TopNav/DateTimeSelectionV2', () => ({
	__esModule: true,
	default: function MockDateTimeSelector(): JSX.Element {
		return <div data-testid="datetime-selector">Mock DateTime Selector</div>;
	},
}));

jest.mock('container/FormAlertRules', () => ({
	__esModule: true,
	default: function MockFormAlertRules({
		alertType,
	}: {
		alertType: AlertTypes;
	}): JSX.Element {
		return (
			<div>
				<h1>Form Alert Rules</h1>
				<p>{alertType}</p>
			</div>
		);
	},
	AlertDetectionTypes: {
		THRESHOLD_ALERT: 'threshold_rule',
		ANOMALY_DETECTION_ALERT: 'anomaly_rule',
	},
}));
jest.mock('container/CreateAlertV2', () => ({
	__esModule: true,
	default: function MockCreateAlertV2({
		alertType,
	}: {
		alertType: AlertTypes;
	}): JSX.Element {
		return (
			<div>
				<h1>Create Alert V2</h1>
				<p>{alertType}</p>
			</div>
		);
	},
}));

const useCompositeQueryParamSpy = jest.spyOn(
	useCompositeQueryParamHooks,
	'useGetCompositeQueryParam',
);
const useUrlQuerySpy = jest.spyOn(useUrlQueryHooks, 'default');
const useSafeNavigateSpy = jest.spyOn(navigateHooks, 'useSafeNavigate');
const useAppContextSpy = jest.spyOn(appHooks, 'useAppContext');

const mockSetUrlQuery = jest.fn();
const mockToString = jest.fn();
const mockGetUrlQuery = jest.fn();
const mockSafeNavigate = jest.fn();
const mockDeleteUrlQuery = jest.fn();

const FORM_ALERT_RULES_TEXT = 'Form Alert Rules';
const CREATE_ALERT_V2_TEXT = 'Create Alert V2';

describe('CreateAlertRule', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useUrlQuerySpy.mockReturnValue({
			set: mockSetUrlQuery,
			toString: mockToString,
			get: mockGetUrlQuery,
			delete: mockDeleteUrlQuery,
		} as Partial<URLSearchParams> as URLSearchParams);
		useCompositeQueryParamSpy.mockReturnValue(initialQueriesMap.metrics);
		useSafeNavigateSpy.mockReturnValue({
			safeNavigate: mockSafeNavigate,
		});
		useAppContextSpy.mockReturnValue(getAppContextMockState());
	});

	it('should render classic flow when showClassicCreateAlertsPage is true', () => {
		mockGetUrlQuery.mockImplementation((key: string) => {
			if (key === QueryParams.showClassicCreateAlertsPage) {
				return 'true';
			}
			if (key === QueryParams.alertType) {
				return AlertTypes.METRICS_BASED_ALERT;
			}
			return null;
		});
		render(<CreateAlertRule />);
		expect(screen.getByText(FORM_ALERT_RULES_TEXT)).toBeInTheDocument();
	});

	it('should render new flow when alertType is provided', () => {
		mockGetUrlQuery.mockImplementation((key: string) => {
			if (key === QueryParams.alertType) {
				return AlertTypes.METRICS_BASED_ALERT;
			}
			return null;
		});
		render(<CreateAlertRule />);
		expect(screen.getByText(CREATE_ALERT_V2_TEXT)).toBeInTheDocument();
	});

	it('should render type selection when no alertType in URL and no compositeQuery', () => {
		mockGetUrlQuery.mockReturnValue(null);
		useCompositeQueryParamSpy.mockReturnValue(null);
		render(<CreateAlertRule />);
		expect(screen.queryByText(FORM_ALERT_RULES_TEXT)).not.toBeInTheDocument();
		expect(screen.queryByText(CREATE_ALERT_V2_TEXT)).not.toBeInTheDocument();
	});

	it('should skip type selection and render alert form when compositeQuery is present', () => {
		mockGetUrlQuery.mockReturnValue(null);
		useCompositeQueryParamSpy.mockReturnValue({
			...initialQueriesMap.metrics,
			builder: {
				...initialQueriesMap.metrics.builder,
				queryData: [
					{
						...initialQueriesMap.metrics.builder.queryData[0],
						dataSource: DataSource.METRICS,
					},
				],
			},
		});
		render(<CreateAlertRule />);
		expect(screen.getByText(CREATE_ALERT_V2_TEXT)).toBeInTheDocument();
		expect(screen.getByText(AlertTypes.METRICS_BASED_ALERT)).toBeInTheDocument();
	});

	it('should render classic flow when ruleType is anomaly_rule even if showClassicCreateAlertsPage is not true', () => {
		mockGetUrlQuery.mockImplementation((key: string) => {
			if (key === QueryParams.showClassicCreateAlertsPage) {
				return 'false';
			}
			if (key === QueryParams.ruleType) {
				return 'anomaly_rule';
			}
			return null;
		});
		render(<CreateAlertRule />);
		expect(screen.getByText(FORM_ALERT_RULES_TEXT)).toBeInTheDocument();
		expect(screen.queryByText(CREATE_ALERT_V2_TEXT)).not.toBeInTheDocument();
	});

	it('should use alertType from URL when provided', () => {
		mockGetUrlQuery.mockImplementation((key: string) => {
			if (key === QueryParams.alertType) {
				return AlertTypes.LOGS_BASED_ALERT;
			}
			return null;
		});
		render(<CreateAlertRule />);
		expect(screen.getByText(CREATE_ALERT_V2_TEXT)).toBeInTheDocument();
		expect(screen.getByText(AlertTypes.LOGS_BASED_ALERT)).toBeInTheDocument();
	});

	it('should use alertType from URL over compositeQuery dataSource', () => {
		mockGetUrlQuery.mockImplementation((key: string) => {
			if (key === QueryParams.alertType) {
				return AlertTypes.LOGS_BASED_ALERT;
			}
			return null;
		});
		useCompositeQueryParamSpy.mockReturnValue({
			...initialQueriesMap.metrics,
			builder: {
				...initialQueriesMap.metrics.builder,
				queryData: [
					{
						...initialQueriesMap.metrics.builder.queryData[0],
						dataSource: DataSource.TRACES,
					},
				],
			},
		});
		render(<CreateAlertRule />);
		expect(screen.getByText(CREATE_ALERT_V2_TEXT)).toBeInTheDocument();
		expect(screen.getByText(AlertTypes.LOGS_BASED_ALERT)).toBeInTheDocument();
	});

	describe('handleSelectType navigation', () => {
		beforeEach(() => {
			mockGetUrlQuery.mockReturnValue(null);
			useCompositeQueryParamSpy.mockReturnValue(null);
		});

		it('should navigate with threshold alert params for metrics alert', () => {
			render(<CreateAlertRule />);
			fireEvent.click(screen.getByText('metric_based_alert'));

			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.ruleType,
				'threshold_rule',
			);
			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.alertType,
				AlertTypes.METRICS_BASED_ALERT,
			);
			expect(mockSafeNavigate).toHaveBeenCalled();
		});

		it('should navigate with threshold alert params for logs alert', () => {
			render(<CreateAlertRule />);
			fireEvent.click(screen.getByText('log_based_alert'));

			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.ruleType,
				'threshold_rule',
			);
			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.alertType,
				AlertTypes.LOGS_BASED_ALERT,
			);
			expect(mockSafeNavigate).toHaveBeenCalled();
		});

		it('should navigate with threshold alert params for traces alert', () => {
			render(<CreateAlertRule />);
			fireEvent.click(screen.getByText('traces_based_alert'));

			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.ruleType,
				'threshold_rule',
			);
			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.alertType,
				AlertTypes.TRACES_BASED_ALERT,
			);
			expect(mockSafeNavigate).toHaveBeenCalled();
		});

		it('should navigate with threshold alert params for exceptions alert', () => {
			render(<CreateAlertRule />);
			fireEvent.click(screen.getByText('exceptions_based_alert'));

			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.ruleType,
				'threshold_rule',
			);
			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.alertType,
				AlertTypes.EXCEPTIONS_BASED_ALERT,
			);
			expect(mockSafeNavigate).toHaveBeenCalled();
		});

		it('should navigate with anomaly detection params for anomaly alert', () => {
			useAppContextSpy.mockReturnValue({
				...getAppContextMockState({}),
				featureFlags: [
					{
						name: FeatureKeys.ANOMALY_DETECTION,
						active: true,
						usage: 0,
						usage_limit: -1,
						route: '',
					},
				],
			});

			render(<CreateAlertRule />);
			fireEvent.click(screen.getByText('anomaly_based_alert'));

			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.ruleType,
				'anomaly_rule',
			);
			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.alertType,
				AlertTypes.METRICS_BASED_ALERT,
			);
			expect(mockSafeNavigate).toHaveBeenCalled();
		});

		it('should navigate even when showClassicCreateAlertsPage flag is present', () => {
			mockGetUrlQuery.mockImplementation((key: string) => {
				if (key === QueryParams.showClassicCreateAlertsPage) {
					return 'true';
				}
				return null;
			});

			render(<CreateAlertRule />);
			fireEvent.click(screen.getByText('metric_based_alert'));

			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.ruleType,
				'threshold_rule',
			);
			expect(mockSetUrlQuery).toHaveBeenCalledWith(
				QueryParams.alertType,
				AlertTypes.METRICS_BASED_ALERT,
			);
			expect(mockSafeNavigate).toHaveBeenCalled();
		});
	});
});
