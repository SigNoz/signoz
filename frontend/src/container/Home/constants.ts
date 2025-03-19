import ROUTES from 'constants/routes';

import { ChecklistItem } from './HomeChecklist/HomeChecklist';

export const checkListStepToPreferenceKeyMap = {
	WILL_DO_LATER: 'WELCOME_CHECKLIST_DO_LATER',
	SEND_LOGS: 'WELCOME_CHECKLIST_SEND_LOGS_SKIPPED',
	SEND_TRACES: 'WELCOME_CHECKLIST_SEND_TRACES_SKIPPED',
	SEND_INFRA_METRICS: 'WELCOME_CHECKLIST_SEND_INFRA_METRICS_SKIPPED',
	SETUP_DASHBOARDS: 'WELCOME_CHECKLIST_SETUP_DASHBOARDS_SKIPPED',
	SETUP_ALERTS: 'WELCOME_CHECKLIST_SETUP_ALERTS_SKIPPED',
	SETUP_SAVED_VIEWS: 'WELCOME_CHECKLIST_SETUP_SAVED_VIEW_SKIPPED',
	SETUP_WORKSPACE: 'WELCOME_CHECKLIST_SETUP_WORKSPACE_SKIPPED',
	ADD_DATA_SOURCE: 'WELCOME_CHECKLIST_ADD_DATA_SOURCE_SKIPPED',
};

export const DOCS_LINKS = {
	ADD_DATA_SOURCE: 'https://signoz.io/docs/instrumentation/overview/',
	SEND_LOGS: 'https://signoz.io/docs/userguide/logs/',
	SEND_TRACES: 'https://signoz.io/docs/userguide/traces/',
	SEND_INFRA_METRICS:
		'https://signoz.io/docs/infrastructure-monitoring/overview/',
	SETUP_ALERTS: 'https://signoz.io/docs/userguide/alerts-management/',
	SETUP_SAVED_VIEWS:
		'https://signoz.io/docs/product-features/saved-view/#step-2-save-your-view',
	SETUP_DASHBOARDS: 'https://signoz.io/docs/userguide/manage-dashboards/',
};

export const defaultChecklistItemsState: ChecklistItem[] = [
	{
		id: 'SETUP_WORKSPACE',
		title: 'Set up your workspace',
		description: '',
		completed: true,
		isSkipped: false,
		isSkippable: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_WORKSPACE,
	},
	{
		id: 'ADD_DATA_SOURCE',
		title: 'Add your first data source',
		description: '',
		completed: false,
		isSkipped: false,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.ADD_DATA_SOURCE,
		toRoute: ROUTES.GET_STARTED_WITH_CLOUD,
		docsLink: DOCS_LINKS.ADD_DATA_SOURCE,
		isSkippable: false,
	},
	{
		id: 'SEND_LOGS',
		title: 'Send your logs',
		description:
			'Send your logs to SigNoz to get more visibility into how your resources interact.',
		completed: false,
		isSkipped: false,
		isSkippable: true,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_LOGS,
		toRoute: ROUTES.GET_STARTED_WITH_CLOUD,
		docsLink: DOCS_LINKS.SEND_LOGS,
	},
	{
		id: 'SEND_TRACES',
		title: 'Send your traces',
		description:
			'Send your traces to SigNoz to get more visibility into how your resources interact.',
		completed: false,
		isSkipped: false,
		isSkippable: true,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_TRACES,
		toRoute: ROUTES.GET_STARTED_WITH_CLOUD,
		docsLink: DOCS_LINKS.SEND_TRACES,
	},
	{
		id: 'SEND_INFRA_METRICS',
		title: 'Send your infra metrics',
		description:
			'Send your infra metrics to SigNoz to get more visibility into your infrastructure.',
		completed: false,
		isSkipped: false,
		isSkippable: true,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SEND_INFRA_METRICS,
		toRoute: ROUTES.GET_STARTED_WITH_CLOUD,
		docsLink: DOCS_LINKS.SEND_INFRA_METRICS,
	},
	{
		id: 'SETUP_ALERTS',
		title: 'Setup Alerts',
		description:
			'Setup alerts to get notified when your resources are not performing as expected.',
		completed: false,
		isSkipped: false,
		isSkippable: true,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_ALERTS,
		toRoute: ROUTES.ALERTS_NEW,
		docsLink: DOCS_LINKS.SETUP_ALERTS,
	},
	{
		id: 'SETUP_SAVED_VIEWS',
		title: 'Setup Saved Views',
		description:
			'Save your views to get a quick overview of your data and share it with your team.',
		completed: false,
		isSkipped: false,
		isSkippable: true,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_SAVED_VIEWS,
		toRoute: ROUTES.LOGS_EXPLORER,
		docsLink: DOCS_LINKS.SETUP_SAVED_VIEWS,
	},
	{
		id: 'SETUP_DASHBOARDS',
		title: 'Setup Dashboards',
		description:
			'Create dashboards to visualize your data and share it with your team.',
		completed: false,
		isSkipped: false,
		isSkippable: true,
		skippedPreferenceKey: checkListStepToPreferenceKeyMap.SETUP_DASHBOARDS,
		toRoute: ROUTES.ALL_DASHBOARD,
		docsLink: DOCS_LINKS.SETUP_DASHBOARDS,
	},
];
