import { fireEvent, render, screen } from '@testing-library/react';
import { FeatureKeys } from 'constants/features';
import { QueryParams } from 'constants/query';
import { AlertDetectionTypes } from 'container/FormAlertRules';
import { getAppContextMockState } from 'container/RoutingPolicies/__tests__/testUtils';
import * as navigateHooks from 'hooks/useSafeNavigate';
import * as useUrlQueryHooks from 'hooks/useUrlQuery';
import * as appHooks from 'providers/App/App';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import AlertTypeSelection from '../AlertTypeSelection';

const useUrlQuerySpy = jest.spyOn(useUrlQueryHooks, 'default');
const useSafeNavigateSpy = jest.spyOn(navigateHooks, 'useSafeNavigate');
const useAppContextSpy = jest.spyOn(appHooks, 'useAppContext');

const mockSetUrlQuery = jest.fn();
const mockSafeNavigate = jest.fn();
const mockToString = jest.fn();
const mockGetUrlQuery = jest.fn();

describe('AlertTypeSelection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		useAppContextSpy.mockReturnValue(getAppContextMockState());
		useUrlQuerySpy.mockReturnValue(({
			set: mockSetUrlQuery,
			toString: mockToString,
			get: mockGetUrlQuery,
		} as Partial<URLSearchParams>) as URLSearchParams);
		useSafeNavigateSpy.mockReturnValue({
			safeNavigate: mockSafeNavigate,
		});
	});

	it('should render all alert type options when anomaly detection is enabled', () => {
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

		render(<AlertTypeSelection />);

		expect(screen.getByText('metric_based_alert')).toBeInTheDocument();
		expect(screen.getByText('log_based_alert')).toBeInTheDocument();
		expect(screen.getByText('traces_based_alert')).toBeInTheDocument();
		expect(screen.getByText('exceptions_based_alert')).toBeInTheDocument();
		expect(screen.getByText('anomaly_based_alert')).toBeInTheDocument();
	});

	it('should render all alert type options except anomaly based alert when anomaly detection is disabled', () => {
		render(<AlertTypeSelection />);

		expect(screen.getByText('metric_based_alert')).toBeInTheDocument();
		expect(screen.getByText('log_based_alert')).toBeInTheDocument();
		expect(screen.getByText('traces_based_alert')).toBeInTheDocument();
		expect(screen.getByText('exceptions_based_alert')).toBeInTheDocument();
		expect(screen.queryByText('anomaly_based_alert')).not.toBeInTheDocument();
	});

	it('should navigate to metrics based alert with correct params', () => {
		render(<AlertTypeSelection />);
		fireEvent.click(screen.getByText('metric_based_alert'));

		expect(mockSetUrlQuery).toHaveBeenCalledTimes(2);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.ruleType,
			AlertDetectionTypes.THRESHOLD_ALERT,
		);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.alertType,
			AlertTypes.METRICS_BASED_ALERT,
		);
		expect(mockSafeNavigate).toHaveBeenCalled();
	});

	it('should navigate to anomaly based alert with correct params', () => {
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

		render(<AlertTypeSelection />);
		fireEvent.click(screen.getByText('anomaly_based_alert'));

		expect(mockSetUrlQuery).toHaveBeenCalledTimes(2);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.ruleType,
			AlertDetectionTypes.ANOMALY_DETECTION_ALERT,
		);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.alertType,
			AlertTypes.METRICS_BASED_ALERT,
		);
		expect(mockSafeNavigate).toHaveBeenCalled();
	});

	it('should navigate to log based alert with correct params', () => {
		render(<AlertTypeSelection />);
		fireEvent.click(screen.getByText('log_based_alert'));

		expect(mockSetUrlQuery).toHaveBeenCalledTimes(2);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.ruleType,
			AlertDetectionTypes.THRESHOLD_ALERT,
		);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.alertType,
			AlertTypes.LOGS_BASED_ALERT,
		);
		expect(mockSafeNavigate).toHaveBeenCalled();
	});

	it('should navigate to traces based alert with correct params', () => {
		render(<AlertTypeSelection />);
		fireEvent.click(screen.getByText('traces_based_alert'));
		expect(mockSetUrlQuery).toHaveBeenCalledTimes(2);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.ruleType,
			AlertDetectionTypes.THRESHOLD_ALERT,
		);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.alertType,
			AlertTypes.TRACES_BASED_ALERT,
		);
		expect(mockSafeNavigate).toHaveBeenCalled();
	});

	it('should navigate to exceptions based alert with correct params', () => {
		render(<AlertTypeSelection />);
		fireEvent.click(screen.getByText('exceptions_based_alert'));
		expect(mockSetUrlQuery).toHaveBeenCalledTimes(2);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.ruleType,
			AlertDetectionTypes.THRESHOLD_ALERT,
		);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.alertType,
			AlertTypes.EXCEPTIONS_BASED_ALERT,
		);
		expect(mockSafeNavigate).toHaveBeenCalled();
	});

	it('should navigate to new create alerts page with correct params if showNewCreateAlertsPage is true', () => {
		useUrlQuerySpy.mockReturnValue(({
			set: mockSetUrlQuery,
			toString: mockToString,
			get: mockGetUrlQuery.mockReturnValue('true'),
		} as Partial<URLSearchParams>) as URLSearchParams);

		render(<AlertTypeSelection />);
		fireEvent.click(screen.getByText('metric_based_alert'));
		expect(mockSetUrlQuery).toHaveBeenCalledTimes(3);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.ruleType,
			AlertDetectionTypes.THRESHOLD_ALERT,
		);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.alertType,
			AlertTypes.METRICS_BASED_ALERT,
		);
		expect(mockSetUrlQuery).toHaveBeenCalledWith(
			QueryParams.showNewCreateAlertsPage,
			'true',
		);
		expect(mockSafeNavigate).toHaveBeenCalled();
	});
});
