import { fireEvent, render, screen } from '@testing-library/react';

import AlertList from '../index';

const ALERTS_PATH = '/alerts';
const TAB_SELECTOR = '.ant-tabs-tab';
const LIST_ALERT_RULES_TEXT = 'List Alert Rules Component';
const TRIGGERED_ALERTS_TEXT = 'Triggered Alerts';
const ALERT_RULES_TEXT = 'Alert Rules';
const CONFIGURATION_TEXT = 'Configuration';
const PLANNED_DOWNTIME_TEXT = 'Planned Downtime';
const ROUTING_POLICIES_TEXT = 'Routing Policies';
const PLANNED_DOWNTIME_SUB_TAB = 'planned-downtime';
const ROUTING_POLICIES_SUB_TAB = 'routing-policies';

const mockUseLocation = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): unknown => mockUseLocation(),
}));

let mockUrlQuery: URLSearchParams;
const mockSet = jest.fn();
const mockDelete = jest.fn();
jest.mock('hooks/useUrlQuery', () => ({
	__esModule: true,
	default: (): URLSearchParams => mockUrlQuery,
}));

const mockSafeNavigate = jest.fn();
jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: (): unknown => ({
		safeNavigate: mockSafeNavigate,
	}),
}));

// Mock components
jest.mock('components/HeaderRightSection/HeaderRightSection', () => ({
	__esModule: true,
	default: function MockHeaderRightSection(): JSX.Element {
		return <div>Header Right Section</div>;
	},
}));
jest.mock('pages/AlertDetails', () => ({
	__esModule: true,
	default: function MockAlertDetails(): JSX.Element {
		return <div>Alert Details Component</div>;
	},
}));
jest.mock('container/PlannedDowntime/PlannedDowntime', () => ({
	PlannedDowntime: function MockPlannedDowntime(): JSX.Element {
		return <div>Planned Downtime Component</div>;
	},
}));
jest.mock('container/RoutingPolicies', () => ({
	__esModule: true,
	default: function MockRoutingPolicies(): JSX.Element {
		return <div>Routing Policies Component</div>;
	},
}));
jest.mock('container/TriggeredAlerts', () => ({
	__esModule: true,
	default: function MockTriggeredAlerts(): JSX.Element {
		return <div>Triggered Alerts Component</div>;
	},
}));
jest.mock('container/ListAlertRules', () => ({
	__esModule: true,
	default: function MockListAlertRules(): JSX.Element {
		return <div>List Alert Rules Component</div>;
	},
}));

const mockLocation = (pathname: string): void => {
	mockUseLocation.mockReturnValue({
		pathname,
	});
};

const mockQueryParams = (params: Record<string, string | null>): void => {
	const realUrlQuery = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== null) {
			realUrlQuery.set(key, value);
		}
	});

	mockSet.mockImplementation((key: string, value: string) => {
		realUrlQuery.set(key, value);
	});
	mockDelete.mockImplementation((key: string) => {
		realUrlQuery.delete(key);
	});

	mockUrlQuery = Object.create(URLSearchParams.prototype, {
		set: { value: mockSet },
		delete: { value: mockDelete },
		toString: { value: (): string => realUrlQuery.toString() },
		get: { value: (key: string): string | null => realUrlQuery.get(key) },
	});
};

const clickTab = (tabText: string): void => {
	const tab = screen.getByText(tabText).closest(TAB_SELECTOR);
	if (tab) {
		fireEvent.click(tab);
	}
};

describe('AlertList', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('Default Rendering', () => {
		it('should render AlertRules tab by default when no tab query param is provided', () => {
			mockQueryParams({});
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText(LIST_ALERT_RULES_TEXT)).toBeInTheDocument();
		});

		it('should render all three main tabs', () => {
			mockQueryParams({});
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText(TRIGGERED_ALERTS_TEXT)).toBeInTheDocument();
			expect(screen.getByText(ALERT_RULES_TEXT)).toBeInTheDocument();
			expect(screen.getByText(CONFIGURATION_TEXT)).toBeInTheDocument();
		});
	});

	describe('Tab Navigation', () => {
		it('should render TriggeredAlerts tab when tab query param is TriggeredAlerts', () => {
			mockQueryParams({ tab: 'TriggeredAlerts' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText('Triggered Alerts Component')).toBeInTheDocument();
		});

		it('should render AlertRules tab when tab query param is AlertRules', () => {
			mockQueryParams({ tab: 'AlertRules' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText(LIST_ALERT_RULES_TEXT)).toBeInTheDocument();
		});

		it('should render Configuration tab with default Planned Downtime sub-tab when tab query param is Configuration', () => {
			mockQueryParams({ tab: 'Configuration' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText(PLANNED_DOWNTIME_TEXT)).toBeInTheDocument();
		});

		it('should navigate to TriggeredAlerts tab when clicked', () => {
			mockQueryParams({ tab: 'AlertRules' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			clickTab(TRIGGERED_ALERTS_TEXT);

			expect(mockSet).toHaveBeenCalledWith('tab', 'TriggeredAlerts');
			expect(mockDelete).toHaveBeenCalledWith('subTab');
			expect(mockSafeNavigate).toHaveBeenCalledWith('/alerts?tab=TriggeredAlerts');
		});

		it('should navigate to AlertRules tab when clicked', () => {
			mockQueryParams({ tab: 'TriggeredAlerts' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			clickTab(ALERT_RULES_TEXT);

			expect(mockSet).toHaveBeenCalledWith('tab', 'AlertRules');
			expect(mockDelete).toHaveBeenCalledWith('subTab');
			expect(mockSafeNavigate).toHaveBeenCalledWith('/alerts?tab=AlertRules');
		});
	});

	describe('Configuration Tab', () => {
		describe('Rendering', () => {
			it('should render Configuration tab with default Planned Downtime sub-tab', () => {
				mockQueryParams({ tab: CONFIGURATION_TEXT });
				mockLocation(ALERTS_PATH);

				render(<AlertList />);

				expect(screen.getByText(PLANNED_DOWNTIME_TEXT)).toBeInTheDocument();
				expect(screen.getByText(ROUTING_POLICIES_TEXT)).toBeInTheDocument();
				expect(screen.getByText('Planned Downtime Component')).toBeInTheDocument();
			});

			it('should render Routing Policies sub-tab when subTab query param is routing-policies', () => {
				mockQueryParams({
					tab: CONFIGURATION_TEXT,
					subTab: ROUTING_POLICIES_SUB_TAB,
				});
				mockLocation(ALERTS_PATH);

				render(<AlertList />);

				expect(screen.getByText('Routing Policies Component')).toBeInTheDocument();
			});
		});

		describe('Navigation', () => {
			it('should navigate to Configuration tab with default subTab when clicked', () => {
				mockQueryParams({ tab: 'AlertRules' });
				mockLocation(ALERTS_PATH);

				render(<AlertList />);

				clickTab(CONFIGURATION_TEXT);

				expect(mockSet).toHaveBeenCalledWith('tab', CONFIGURATION_TEXT);
				expect(mockSet).toHaveBeenCalledWith('subTab', PLANNED_DOWNTIME_SUB_TAB);
				expect(mockSafeNavigate).toHaveBeenCalledWith(
					`/alerts?tab=Configuration&subTab=${PLANNED_DOWNTIME_SUB_TAB}`,
				);
			});

			it('should preserve existing subTab when navigating to Configuration tab', () => {
				mockQueryParams({ tab: 'AlertRules', subTab: ROUTING_POLICIES_SUB_TAB });
				mockLocation(ALERTS_PATH);

				render(<AlertList />);

				clickTab(CONFIGURATION_TEXT);

				expect(mockSafeNavigate).toHaveBeenCalledWith(
					`/alerts?tab=Configuration&subTab=${ROUTING_POLICIES_SUB_TAB}`,
				);
			});

			it('should clear subTab when navigating away from Configuration tab', () => {
				mockQueryParams({
					tab: CONFIGURATION_TEXT,
					subTab: PLANNED_DOWNTIME_SUB_TAB,
				});
				mockLocation(ALERTS_PATH);

				render(<AlertList />);

				clickTab(ALERT_RULES_TEXT);

				expect(mockDelete).toHaveBeenCalledWith('subTab');
				expect(mockSafeNavigate).toHaveBeenCalledWith('/alerts?tab=AlertRules');
			});
		});
	});
});
