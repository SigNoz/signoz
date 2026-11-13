import type { Meta, StoryObj } from '@storybook/react-vite';
import ROUTES from 'constants/routes';
import { renderAtRoute } from '@/storybook/renderAtRoute';

import { storyMocks } from '@/storybook/controls/defineStoryMocks';
import type { GlobalMockArgs } from '@/storybook/globals';
import type { PageStoryArgs } from '@/storybook/runtime/resolveStory';
import {
	openAddCardModal,
	raiseToast,
} from '../__story_mockdata__/bottomStrip.play';
import CreateAlertPage from 'pages/CreateAlert';
import { createAlertMocks } from 'pages/CreateAlert/stories/CreateAlert.stories.mocks';
import DashboardPage from 'pages/DashboardPage/DashboardPage';
import PanelEditorPage from 'pages/DashboardPage/PanelEditorPage/PanelEditorPage';
import { panelEditorMocks } from 'pages/DashboardPage/PanelEditorPage/stories/PanelEditorPage.stories.mocks';
import { dashboardMocks } from 'pages/DashboardPage/stories/DashboardPage.stories.mocks';
import DashboardsListPage from 'pages/DashboardsListPage/DashboardsListPage';
import { dashboardsListMocks } from 'pages/DashboardsListPage/stories/DashboardsListPage.stories.mocks';
import { openRenameDialog } from 'pages/DashboardsListPage/stories/__story_mockdata__/dashboardsList.play';
import HomePage from 'pages/HomePage/HomePage';
import { homeMocks } from 'pages/HomePage/stories/HomePage.stories.mocks';
import InfrastructureMonitoringPage from 'pages/InfrastructureMonitoring/InfrastructureMonitoringPage';
import { podsMocks } from 'pages/InfrastructureMonitoring/stories/Kubernetes.stories.mocks';
import { openDrawerLogsTab } from 'pages/InfrastructureMonitoring/stories/__story_mockdata__/pods.play';
import LogsModulePage from 'pages/LogsModulePage/LogsModulePage';
import { logsMocks } from 'pages/LogsModulePage/stories/LogsModulePage.stories.mocks';
import { dirtyQuickFiltersSettings as dirtyLogsQuickFilters } from 'pages/LogsModulePage/stories/__story_mockdata__/logs.play';
import MetricsExplorerPage from 'pages/MetricsExplorer/MetricsExplorerPage';
import { metricsMocks } from 'pages/MetricsExplorer/stories/MetricsExplorerPage.stories.mocks';
import TraceDetailsV3 from 'pages/TraceDetailsV3';
import { traceDetailsMocks } from 'pages/TraceDetailsV3/stories/TraceDetailsV3.stories.mocks';
import TracesModulePage from 'pages/TracesModulePage/TracesModulePage';
import { tracesMocks } from 'pages/TracesModulePage/stories/TracesModulePage.stories.mocks';
import { showsSpanDetails } from 'pages/TracesModulePage/stories/__story_mockdata__/spanDrawer.play';
import { dirtyQuickFiltersSettings as dirtyTracesQuickFilters } from 'pages/TracesModulePage/stories/__story_mockdata__/traces.play';

import { withTrialBanner } from './__story_mockdata__/hostBanners.play';

type HomeArgs = PageStoryArgs<typeof homeMocks>;
type CreateAlertArgs = PageStoryArgs<typeof createAlertMocks>;
type DashboardArgs = PageStoryArgs<typeof dashboardMocks>;
type MetricsArgs = PageStoryArgs<typeof metricsMocks>;
type LogsArgs = PageStoryArgs<typeof logsMocks>;
type TraceDetailsArgs = PageStoryArgs<typeof traceDetailsMocks>;
type TracesArgs = PageStoryArgs<typeof tracesMocks>;
type PodsArgs = PageStoryArgs<typeof podsMocks>;
type DashboardsListArgs = PageStoryArgs<typeof dashboardsListMocks>;
type PanelEditorArgs = PageStoryArgs<typeof panelEditorMocks>;

const home = storyMocks(homeMocks, { route: ROUTES.HOME, layout: 'app' });
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

/** Home: nothing fixed to the bottom but the strip. */
export const Home: StoryObj<HomeArgs> = {
	...home,
	render: () => <HomePage />,
	play: withTrialBanner(),
};

/** Create alert: the fixed footer with the save and test actions. */
export const AlertsCreate: StoryObj<CreateAlertArgs> = {
	...createAlert,
	render: () => <CreateAlertPage />,
	play: withTrialBanner(),
};

/** A locked dashboard: the lock indicator fixed to the bottom of the grid. */
export const DashboardLocked: StoryObj<DashboardArgs> = {
	...dashboard,
	args: { ...dashboard.args, locked: true },
	render: renderAtRoute(ROUTES.DASHBOARD, DashboardPage),
	play: withTrialBanner(),
};

/** Metrics summary: the pagination fixed to the bottom of the list. */
export const MetricsSummary: StoryObj<MetricsArgs> = {
	...metrics,
	render: () => <MetricsExplorerPage />,
	play: withTrialBanner(),
};

/** Logs explorer: the list and the frequency chart under the query builder. */
export const LogsExplorer: StoryObj<LogsArgs> = {
	...logs,
	render: () => <LogsModulePage />,
	play: withTrialBanner(),
};

/** Trace details: the waterfall and the span panel filling the page. */
export const TraceDetails: StoryObj<TraceDetailsArgs> = {
	...traceDetails,
	render: renderAtRoute(ROUTES.TRACE_DETAIL, TraceDetailsV3),
	play: withTrialBanner(),
};

/** Logs quick filters settings: the action footer with an unsaved change. */
export const QuickFiltersSettingsLogs: StoryObj<LogsArgs> = {
	...logs,
	render: () => <LogsModulePage />,
	play: withTrialBanner(dirtyLogsQuickFilters),
};

/** Traces quick filters settings: the action footer with an unsaved change. */
export const QuickFiltersSettingsTraces: StoryObj<TracesArgs> = {
	...traces,
	render: () => <TracesModulePage />,
	play: withTrialBanner(dirtyTracesQuickFilters),
};

/** Span drawer: the details drawer opened from a row of the traces list. */
export const SpanDrawer: StoryObj<TracesArgs> = {
	...traces,
	render: () => <TracesModulePage />,
	play: withTrialBanner(showsSpanDetails),
};

/** Pods details drawer: the drawer over the list, on its logs tab. */
export const PodsDetailsDrawer: StoryObj<PodsArgs> = {
	...pods,
	args: { ...pods.args, drawer: true },
	render: () => <InfrastructureMonitoringPage />,
	play: withTrialBanner(openDrawerLogsTab),
};

/** Dashboards list: the rename dialog opened from a row. */
export const RenameDashboardDialog: StoryObj<DashboardsListArgs> = {
	...dashboardsList,
	render: () => <DashboardsListPage />,
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
	render: renderAtRoute(ROUTES.DASHBOARD_PANEL_EDITOR, PanelEditorPage),
	play: withTrialBanner(),
};
