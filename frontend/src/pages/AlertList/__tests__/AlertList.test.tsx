import { fireEvent, render, screen } from '@testing-library/react';

import AlertList from '../index';

const ALERTS_PATH = '/alerts';
const TAB_SELECTOR = '.ant-tabs-tab';
const LIST_ALERT_RULES_TEXT = 'List Alert Rules Component';
const TRIGGERED_ALERTS_TEXT = 'Triggered Alerts';
const ALERT_RULES_TEXT = 'Alert Rules';
const PLANNED_DOWNTIME_TEXT = 'Planned Downtime';
const ROUTING_POLICIES_TEXT = 'Routing Policies';
const PLANNED_DOWNTIME_TAB = 'PlannedDowntime';
const ROUTING_POLICIES_TAB = 'RoutingPolicies';

const mockUseLocation = jest.fn();
jest.mock('react-router-dom', () => ({
	...jest.requireActual('react-router-dom'),
	useLocation: (): unknown => mockUseLocation(),
}));

let mockUrlQuery: URLSearchParams;
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
	mockUrlQuery = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== null) {
			mockUrlQuery.set(key, value);
		}
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

		it('should render all four top-level tabs', () => {
			mockQueryParams({});
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText(TRIGGERED_ALERTS_TEXT)).toBeInTheDocument();
			expect(screen.getByText(ALERT_RULES_TEXT)).toBeInTheDocument();
			expect(screen.getByText(PLANNED_DOWNTIME_TEXT)).toBeInTheDocument();
			expect(screen.getByText(ROUTING_POLICIES_TEXT)).toBeInTheDocument();
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

		it('should render PlannedDowntime tab when tab query param is PlannedDowntime', () => {
			mockQueryParams({ tab: PLANNED_DOWNTIME_TAB });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText('Planned Downtime Component')).toBeInTheDocument();
		});

		it('should render RoutingPolicies tab when tab query param is RoutingPolicies', () => {
			mockQueryParams({ tab: ROUTING_POLICIES_TAB });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText('Routing Policies Component')).toBeInTheDocument();
		});

		it('should navigate to TriggeredAlerts tab when clicked', () => {
			mockQueryParams({ tab: 'AlertRules' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			clickTab(TRIGGERED_ALERTS_TEXT);

			expect(mockSafeNavigate).toHaveBeenCalledWith('/alerts?tab=TriggeredAlerts');
		});

		it('should navigate to PlannedDowntime tab when clicked', () => {
			mockQueryParams({ tab: 'AlertRules' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			clickTab(PLANNED_DOWNTIME_TEXT);

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				`/alerts?tab=${PLANNED_DOWNTIME_TAB}`,
			);
		});

		it('should navigate to RoutingPolicies tab when clicked', () => {
			mockQueryParams({ tab: 'AlertRules' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			clickTab(ROUTING_POLICIES_TEXT);

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				`/alerts?tab=${ROUTING_POLICIES_TAB}`,
			);
		});
	});

	describe('Legacy URL redirect', () => {
		it('should redirect legacy Configuration + planned-downtime URLs to PlannedDowntime', () => {
			mockQueryParams({ tab: 'Configuration', subTab: 'planned-downtime' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				`/alerts?tab=${PLANNED_DOWNTIME_TAB}`,
			);
		});

		it('should redirect legacy Configuration + routing-policies URLs to RoutingPolicies', () => {
			mockQueryParams({ tab: 'Configuration', subTab: 'routing-policies' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				`/alerts?tab=${ROUTING_POLICIES_TAB}`,
			);
		});

		it('should default legacy Configuration without subTab to PlannedDowntime', () => {
			mockQueryParams({ tab: 'Configuration' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				`/alerts?tab=${PLANNED_DOWNTIME_TAB}`,
			);
		});
	});
});
