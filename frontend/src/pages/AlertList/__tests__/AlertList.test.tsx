import { fireEvent, render, screen } from '@testing-library/react';
import { mockAppLocation } from 'tests/router-mocks';

import AlertList from '../index';

const ALERTS_PATH = '/alerts';
const TAB_SELECTOR = '.ant-tabs-tab';
const LIST_ALERT_RULES_TEXT = 'List Alert Rules Component';
const TRIGGERED_ALERTS_TEXT = 'Triggered Alerts';
const ALERT_RULES_TEXT = 'Alert Rules';
const CONFIGURATION_TEXT = 'Configuration';
const NOTIFICATION_CHANNELS_TEXT = 'Notification Channels';
const PLANNED_DOWNTIME_TEXT = 'Planned Downtime';
const ROUTING_POLICIES_TEXT = 'Routing Policies';
const CHANNELS_SUB_TAB = 'channels';
const PLANNED_DOWNTIME_SUB_TAB = 'planned-downtime';
const ROUTING_POLICIES_SUB_TAB = 'routing-policies';

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
jest.mock('../NotificationChannels/NotificationChannels', () => ({
	__esModule: true,
	default: function MockNotificationChannels(): JSX.Element {
		return <div>Notification Channels Component</div>;
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
	mockAppLocation({ pathname });
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

		it('should navigate to TriggeredAlerts tab when clicked', () => {
			mockQueryParams({ tab: 'AlertRules' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			clickTab(TRIGGERED_ALERTS_TEXT);

			expect(mockSafeNavigate).toHaveBeenCalledWith('/alerts?tab=TriggeredAlerts');
		});

		it('should navigate to AlertRules tab when clicked', () => {
			mockQueryParams({ tab: 'TriggeredAlerts' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			clickTab(ALERT_RULES_TEXT);

			expect(mockSafeNavigate).toHaveBeenCalledWith('/alerts?tab=AlertRules');
		});

		it('should navigate to Configuration tab with default channels subTab when clicked', () => {
			mockQueryParams({ tab: 'AlertRules' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			clickTab(CONFIGURATION_TEXT);

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				`/alerts?tab=Configuration&subTab=${CHANNELS_SUB_TAB}`,
			);
		});
	});

	describe('Configuration Tab with Secondary Sidebar', () => {
		it('should render Configuration tab with secondary sidebar containing channels, routing policies, and planned downtime', () => {
			mockQueryParams({ tab: 'Configuration' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(
				screen.getByTestId('alert-configuration-sidebar'),
			).toBeInTheDocument();
			expect(screen.getByText(NOTIFICATION_CHANNELS_TEXT)).toBeInTheDocument();
			expect(screen.getByText(ROUTING_POLICIES_TEXT)).toBeInTheDocument();
			expect(screen.getByText(PLANNED_DOWNTIME_TEXT)).toBeInTheDocument();
			expect(
				screen.getByText('Notification Channels Component'),
			).toBeInTheDocument();
		});

		it('should render Routing Policies when subTab is routing-policies', () => {
			mockQueryParams({
				tab: 'Configuration',
				subTab: ROUTING_POLICIES_SUB_TAB,
			});
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText('Routing Policies Component')).toBeInTheDocument();
		});

		it('should render Planned Downtime when subTab is planned-downtime', () => {
			mockQueryParams({
				tab: 'Configuration',
				subTab: PLANNED_DOWNTIME_SUB_TAB,
			});
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText('Planned Downtime Component')).toBeInTheDocument();
		});

		it('should navigate to Routing Policies subtab when clicked in secondary sidebar', () => {
			mockQueryParams({ tab: 'Configuration', subTab: CHANNELS_SUB_TAB });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			fireEvent.click(
				screen.getByTestId('configuration-sidebar-routing-policies'),
			);

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				`/alerts?tab=Configuration&subTab=${ROUTING_POLICIES_SUB_TAB}`,
			);
		});

		it('should navigate to Planned Downtime subtab when clicked in secondary sidebar', () => {
			mockQueryParams({ tab: 'Configuration', subTab: CHANNELS_SUB_TAB });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			fireEvent.click(
				screen.getByTestId('configuration-sidebar-planned-downtime'),
			);

			expect(mockSafeNavigate).toHaveBeenCalledWith(
				`/alerts?tab=Configuration&subTab=${PLANNED_DOWNTIME_SUB_TAB}`,
			);
		});

		it('should support legacy RoutingPolicies query param as Configuration tab', () => {
			mockQueryParams({ tab: 'RoutingPolicies' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText('Routing Policies Component')).toBeInTheDocument();
		});

		it('should support legacy PlannedDowntime query param as Configuration tab', () => {
			mockQueryParams({ tab: 'PlannedDowntime' });
			mockLocation(ALERTS_PATH);

			render(<AlertList />);

			expect(screen.getByText('Planned Downtime Component')).toBeInTheDocument();
		});
	});
});
