import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import {
	loadPage,
	renderLoadedPage,
	renderLoadedPageAtRoute,
} from '@/storybook/loadPage';
import type { GlobalMockArgs } from '@/storybook/globals';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import {
	openAddCardModal,
	raiseToast,
} from '../__story_mockdata__/bottomStrip.play';
import { createAlertMocks } from 'pages/CreateAlert/stories/CreateAlert.stories.mocks';
import { panelEditorMocks } from 'pages/DashboardPage/PanelEditorPage/stories/PanelEditorPage.stories.mocks';
import { dashboardMocks } from 'pages/DashboardPage/stories/DashboardPage.stories.mocks';
import { dashboardsListMocks } from 'pages/DashboardsListPage/stories/DashboardsListPage.stories.mocks';
import { openRenameDialog } from 'pages/DashboardsListPage/stories/__story_mockdata__/dashboardsList.play';
import { podsMocks } from 'pages/InfrastructureMonitoring/stories/Kubernetes.stories.mocks';
import { openDrawerLogsTab } from 'pages/InfrastructureMonitoring/stories/__story_mockdata__/pods.play';
import { logsMocks } from 'pages/LogsModulePage/stories/LogsModulePage.stories.mocks';
import { dirtyQuickFiltersSettings as dirtyLogsQuickFilters } from 'pages/LogsModulePage/stories/__story_mockdata__/logs.play';
import { metricsMocks } from 'pages/MetricsExplorer/stories/MetricsExplorerPage.stories.mocks';
import { traceDetailsMocks } from 'pages/TraceDetailsV3/stories/TraceDetailsV3.stories.mocks';
import { tracesMocks } from 'pages/TracesModulePage/stories/TracesModulePage.stories.mocks';
import { showsSpanDetails } from 'pages/TracesModulePage/stories/__story_mockdata__/spanDrawer.play';
import { dirtyQuickFiltersSettings as dirtyTracesQuickFilters } from 'pages/TracesModulePage/stories/__story_mockdata__/traces.play';

import { withTrialBanner } from './__story_mockdata__/hostBanners.play';

type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;
type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;
type MetricsArgs = PageStoryArgs<typeof metricsMocks>;
type LogsArgs = PageStoryArgs<typeof logsMocks>;
type TraceDetailsArgs = PageStoryArgs<typeof traceDetailsMocks>;
type TracesArgs = PageStoryArgs<typeof tracesMocks>;
type PodsArgs = PageStoryArgs<typeof podsMocks>;
type DashboardsListArgs = PageStoryArgs<typeof dashboardsListMocks>;
type PanelEditorArgs = PageStoryArgs<typeof panelEditorMocks>;

const loadCreateAlert = loadPage(() => import('pages/CreateAlert'));
const loadDashboard = loadPage(
	() => import('pages/DashboardPage/DashboardPage'),
);
const loadMetrics = loadPage(
	() => import('pages/MetricsExplorer/MetricsExplorerPage'),
);
const loadLogs = loadPage(() => import('pages/LogsModulePage/LogsModulePage'));
const loadTraceDetails = loadPage(() => import('pages/TraceDetailsV3'));
const loadTraces = loadPage(
	() => import('pages/TracesModulePage/TracesModulePage'),
);
const loadPods = loadPage(
	() => import('pages/InfrastructureMonitoring/InfrastructureMonitoringPage'),
);
const loadDashboardsList = loadPage(
	() => import('pages/DashboardsListPage/DashboardsListPage'),
);
const loadPanelEditor = loadPage(
	() => import('pages/DashboardPage/PanelEditorPage/PanelEditorPage'),
);

const createAlert = storyMocks(createAlertMocks, { layout: 'app' });
const dashboard = storyMocks(dashboardMocks, { layout: 'app' });
const metrics = storyMocks(metricsMocks, { layout: 'app' });
const logs = storyMocks(logsMocks, { layout: 'app' });
const traceDetails = storyMocks(traceDetailsMocks, { layout: 'app' });
const traces = storyMocks(tracesMocks, { layout: 'app' });
const pods = storyMocks(podsMocks, { layout: 'app' });
const dashboardsList = storyMocks(dashboardsListMocks, { layout: 'app' });
const panelEditor = storyMocks(panelEditorMocks, { layout: 'app' });

/**
 * The trial-expiry banner on every host that pins something to the bottom of the
 * shell or opens an overlay, one story per host.
 *
 * Route: each story uses its host page's own.
 */
const meta = {
	title: 'Foundations/Banners/Shell Hosts',
	tags: ['play'],
	args: { banner: 'trial-expiry' },
} satisfies Meta<GlobalMockArgs>;

export default meta;

/** Create alert: the fixed footer with the save and test actions. */
export const AlertsCreate: StoryObj<CreateAlertArgs> = {
	...createAlert,
	loaders: [loadCreateAlert],
	render: renderLoadedPage,
	play: withTrialBanner(),
};

/** A locked dashboard: the lock indicator fixed to the bottom of the grid. */
export const DashboardLocked: StoryObj<DashboardArgs> = {
	...dashboard,
	args: { ...dashboard.args, locked: true },
	loaders: [loadDashboard],
	render: renderLoadedPageAtRoute(ROUTES.DASHBOARD),
	play: withTrialBanner(),
};

/** Metrics summary: the pagination fixed to the bottom of the list. */
export const MetricsSummary: StoryObj<MetricsArgs> = {
	...metrics,
	loaders: [loadMetrics],
	render: renderLoadedPage,
	play: withTrialBanner(),
};

/** Logs explorer: the list and the frequency chart under the query builder. */
export const LogsExplorer: StoryObj<LogsArgs> = {
	...logs,
	loaders: [loadLogs],
	render: renderLoadedPage,
	play: withTrialBanner(),
};

/** Trace details: the waterfall and the span panel filling the page. */
export const TraceDetails: StoryObj<TraceDetailsArgs> = {
	...traceDetails,
	loaders: [loadTraceDetails],
	render: renderLoadedPageAtRoute(ROUTES.TRACE_DETAIL),
	play: withTrialBanner(),
};

/** Logs quick filters settings: the action footer with an unsaved change. */
export const QuickFiltersSettingsLogs: StoryObj<LogsArgs> = {
	...logs,
	loaders: [loadLogs],
	render: renderLoadedPage,
	play: withTrialBanner(dirtyLogsQuickFilters),
};

/** Traces quick filters settings: the action footer with an unsaved change. */
export const QuickFiltersSettingsTraces: StoryObj<TracesArgs> = {
	...traces,
	loaders: [loadTraces],
	render: renderLoadedPage,
	play: withTrialBanner(dirtyTracesQuickFilters),
};

/** Span drawer: the details drawer opened from a row of the traces list. */
export const SpanDrawer: StoryObj<TracesArgs> = {
	...traces,
	loaders: [loadTraces],
	render: renderLoadedPage,
	play: withTrialBanner(showsSpanDetails),
};

/** Pods details drawer: the drawer over the list, on its logs tab. */
export const PodsDetailsDrawer: StoryObj<PodsArgs> = {
	...pods,
	args: { ...pods.args, drawer: true },
	loaders: [loadPods],
	render: renderLoadedPage,
	play: withTrialBanner(openDrawerLogsTab),
};

/** Dashboards list: the rename dialog opened from a row. */
export const RenameDashboardDialog: StoryObj<DashboardsListArgs> = {
	...dashboardsList,
	loaders: [loadDashboardsList],
	render: renderLoadedPage,
	play: withTrialBanner(openRenameDialog),
};

/** Add Credit Card modal opened from the strip's Support. */
export const AddCreditCardModal: StoryObj<GlobalMockArgs> = {
	args: { noz: true, support: 'add-card' },
	parameters: { signoz: { route: ROUTES.HOME, layout: 'app' } },
	render: () => <div />,
	play: withTrialBanner(openAddCardModal),
};

/** A toast raised over the strip. */
export const Toast: StoryObj<GlobalMockArgs> = {
	args: { noz: true, support: 'pylon' },
	parameters: { signoz: { route: ROUTES.HOME, layout: 'app' } },
	render: () => <div />,
	play: withTrialBanner(raiseToast),
};

/** Panel editor: a full-screen route with no bottom strip. */
export const PanelEditor: StoryObj<PanelEditorArgs> = {
	...panelEditor,
	loaders: [loadPanelEditor],
	render: renderLoadedPageAtRoute(ROUTES.DASHBOARD_PANEL_EDITOR),
	play: withTrialBanner(),
};
