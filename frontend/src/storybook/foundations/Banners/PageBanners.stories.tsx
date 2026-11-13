import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { GlobalMockArgs } from '@/storybook/globals';
import { renderAtRoute } from '@/storybook/renderAtRoute';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import CreateAlertPage from 'pages/CreateAlert';
import { enableRoutingPolicies } from 'pages/CreateAlert/stories/__story_mockdata__/createAlert.play';
import { createAlertMocks } from 'pages/CreateAlert/stories/CreateAlert.stories.mocks';
import MeterExplorerPage from 'pages/MeterExplorer/MeterExplorerPage';
import { meterMocks } from 'pages/MeterExplorer/stories/MeterExplorer.stories.mocks';
import MetricsExplorerPage from 'pages/MetricsExplorer/MetricsExplorerPage';
import { metricsMocks } from 'pages/MetricsExplorer/stories/MetricsExplorerPage.stories.mocks';
import ServiceTopLevelOperations from 'pages/ServiceTopLevelOperations';
import { serviceTopLevelOperationsMocks } from 'pages/ServiceTopLevelOperations/stories/ServiceTopLevelOperations.stories.mocks';
import SettingsPage from 'pages/Settings/Settings';
import { billingMocks } from 'pages/Settings/Billing/stories/Billing.stories.mocks';
import TraceDetailsV3 from 'pages/TraceDetailsV3';
import { showsMissingSpansBanner } from 'pages/TraceDetailsV3/stories/__story_mockdata__/traceDetails.play';
import { traceDetailsMocks } from 'pages/TraceDetailsV3/stories/TraceDetailsV3.stories.mocks';

import {
	showsCancelSubscription,
	showsClickHouseInfo,
	showsMeterBeforeLaunch,
	showsMeterBillingNotice,
	showsMeterShortWindow,
	showsPendingActivation,
	showsTopLevelOperationsThreshold,
} from './__story_mockdata__/pageBanners.play';

type TraceDetailsArgs = PageStoryArgs<typeof traceDetailsMocks>;
type MetricsArgs = PageStoryArgs<typeof metricsMocks>;
type BillingArgs = PageStoryArgs<typeof billingMocks>;
type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;
type MeterArgs = PageStoryArgs<typeof meterMocks>;
type TopLevelOperationsArgs = PageStoryArgs<
	typeof serviceTopLevelOperationsMocks
>;

const traceDetails = storyMocks(traceDetailsMocks, { layout: 'app' });
const metrics = storyMocks(metricsMocks, { layout: 'app' });
const billing = storyMocks(billingMocks, { layout: 'app' });
const createAlert = storyMocks(createAlertMocks, { layout: 'app' });
const meter = storyMocks(meterMocks, { layout: 'app' });
const topLevelOperations = storyMocks(serviceTopLevelOperationsMocks, {
	layout: 'app',
});

/**
 * Every banner and notice a page renders inside its own content, one per story on
 * the page that shows it. The shell's own banners are under Shell.
 *
 * Route: each story uses its page's own.
 */
const meta = {
	title: 'Foundations/Banners/Page',
	tags: ['play'],
} satisfies Meta<GlobalMockArgs>;

export default meta;

/** "This trace has missing spans": the backend never received some of the trace's spans. */
export const MissingSpans: StoryObj<TraceDetailsArgs> = {
	...traceDetails,
	args: { ...traceDetails.args, missingSpans: true },
	render: renderAtRoute(ROUTES.TRACE_DETAIL, TraceDetailsV3),
	play: showsMissingSpansBanner,
};

/**
 * "Volume changes take effect within about 5 minutes": the metric's reduction
 * rule was saved moments ago and is not active yet.
 */
export const PendingActivation: StoryObj<MetricsArgs> = {
	...metrics,
	args: { ...metrics.args, drawer: 'details', drawerMetric: 'histogram' },
	render: () => <MetricsExplorerPage />,
	play: showsPendingActivation,
};

/** "Cancel your subscription": at the foot of Billing on an activated cloud workspace. */
export const CancelSubscription: StoryObj<BillingArgs> = {
	...billing,
	// The banner sits below the fold of the default 1200px viewport.
	parameters: { ...billing.parameters, sbshot: { viewport: { height: 1400 } } },
	render: () => <SettingsPage />,
	play: showsCancelSubscription,
};

/**
 * "Use Routing Policies for dynamic routing": under the thresholds of every rule
 * type, here switched on, which takes the channel picker off the condition.
 */
export const RoutingPolicies: StoryObj<CreateAlertArgs> = {
	...createAlert,
	args: { ...createAlert.args, alertMode: 'anomaly' },
	render: () => <CreateAlertPage />,
	play: enableRoutingPolicies,
};

/** "Learn to write faster, optimized queries": above the ClickHouse query editor. */
export const ClickHouseQuery: StoryObj<CreateAlertArgs> = {
	...createAlert,
	args: { ...createAlert.args, alertMode: 'logs' },
	render: () => <CreateAlertPage />,
	play: showsClickHouseInfo,
};

/** "Billing is calculated in UTC": above the breakdown until it is dismissed. */
export const MeterBillingNotice: StoryObj<MeterArgs> = {
	...meter,
	render: () => <MeterExplorerPage />,
	play: showsMeterBillingNotice,
};

/** The same notice closed, which the app remembers across visits. */
export const MeterBillingNoticeDismissed: StoryObj<MeterArgs> = {
	...meter,
	args: { ...meter.args, billingNotice: false },
	render: () => <MeterExplorerPage />,
	play: showsMeterBillingNotice,
};

/** "Meter module data is accurate only from 22nd August 2025": a cloud window from the beta phase. */
export const MeterBeforeLaunch: StoryObj<MeterArgs> = {
	...meter,
	args: { ...meter.args, timeRange: 'august-2025' },
	render: () => <MeterExplorerPage />,
	play: showsMeterBeforeLaunch,
};

/** "Meter metrics data is aggregated over 1 hour period": a window shorter than an hour. */
export const MeterShortWindow: StoryObj<MeterArgs> = {
	...meter,
	args: { ...meter.args, timeRange: 'last-30-minutes' },
	render: () => <MeterExplorerPage />,
	play: showsMeterShortWindow,
};

/**
 * "SigNoz calculates the RED metrics using the entry-point spans": above the list
 * of top level operations.
 */
export const TopLevelOperationsThreshold: StoryObj<TopLevelOperationsArgs> = {
	...topLevelOperations,
	render: renderAtRoute(
		ROUTES.SERVICE_TOP_LEVEL_OPERATIONS,
		ServiceTopLevelOperations,
	),
	play: showsTopLevelOperationsThreshold,
};
