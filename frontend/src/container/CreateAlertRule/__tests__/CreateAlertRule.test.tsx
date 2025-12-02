import { render, screen } from '@testing-library/react';
import { QueryParams } from 'constants/query';
import { initialQueriesMap } from 'constants/queryBuilder';
import * as useCompositeQueryParamHooks from 'hooks/queryBuilder/useGetCompositeQueryParam';
import * as useUrlQueryHooks from 'hooks/useUrlQuery';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { DataSource } from 'types/common/queryBuilder';

import CreateAlertRule from '../index';

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
	default: function MockCreateAlertV2(): JSX.Element {
		return <div>Create Alert V2</div>;
	},
}));

const useCompositeQueryParamSpy = jest.spyOn(
	useCompositeQueryParamHooks,
	'useGetCompositeQueryParam',
);
const useUrlQuerySpy = jest.spyOn(useUrlQueryHooks, 'default');

const mockSetUrlQuery = jest.fn();
const mockToString = jest.fn();
const mockGetUrlQuery = jest.fn();

const FORM_ALERT_RULES_TEXT = 'Form Alert Rules';
const CREATE_ALERT_V2_TEXT = 'Create Alert V2';

describe('CreateAlertRule', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useUrlQuerySpy.mockReturnValue(({
			set: mockSetUrlQuery,
			toString: mockToString,
			get: mockGetUrlQuery,
		} as Partial<URLSearchParams>) as URLSearchParams);
		useCompositeQueryParamSpy.mockReturnValue(initialQueriesMap.metrics);
	});

	it('should render v1 flow when showNewCreateAlertsPage is false', () => {
		mockGetUrlQuery.mockReturnValue(null);
		render(<CreateAlertRule />);
		expect(screen.getByText(FORM_ALERT_RULES_TEXT)).toBeInTheDocument();
	});

	it('should render v2 flow when showNewCreateAlertsPage is true', () => {
		mockGetUrlQuery.mockImplementation((key: string) => {
			if (key === QueryParams.showNewCreateAlertsPage) {
				return 'true';
			}
			return null;
		});
		render(<CreateAlertRule />);
		expect(screen.getByText(CREATE_ALERT_V2_TEXT)).toBeInTheDocument();
	});

	it('should render v1 flow when ruleType is anomaly_rule even if showNewCreateAlertsPage is true', () => {
		mockGetUrlQuery.mockImplementation((key: string) => {
			if (key === QueryParams.showNewCreateAlertsPage) {
				return 'true';
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
		expect(screen.getByText(FORM_ALERT_RULES_TEXT)).toBeInTheDocument();
		expect(screen.getByText(AlertTypes.LOGS_BASED_ALERT)).toBeInTheDocument();
	});

	it('should use alertType from compositeQuery dataSource when alertType is not in URL', () => {
		mockGetUrlQuery.mockReturnValue(null);
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
		expect(screen.getByText(FORM_ALERT_RULES_TEXT)).toBeInTheDocument();
		expect(screen.getByText(AlertTypes.TRACES_BASED_ALERT)).toBeInTheDocument();
	});

	it('should default to METRICS_BASED_ALERT when no alertType and no compositeQuery', () => {
		mockGetUrlQuery.mockReturnValue(null);
		useCompositeQueryParamSpy.mockReturnValue(null);
		render(<CreateAlertRule />);
		expect(screen.getByText(FORM_ALERT_RULES_TEXT)).toBeInTheDocument();
		expect(screen.getByText(AlertTypes.METRICS_BASED_ALERT)).toBeInTheDocument();
	});
});
