import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { themeColors } from 'constants/theme';

export const styles = { background: '#1f1f1f' };

export const subMenuStyles = {
	background: '#1f1f1f',
	margin: '0rem',
	width: '100%',
	color: themeColors.gainsboro,
};

export const routeConfig: Record<string, QueryParams[]> = {
	[ROUTES.SERVICE_METRICS]: [QueryParams.resourceAttributes],
	[ROUTES.SERVICE_MAP]: [QueryParams.resourceAttributes],
	[ROUTES.ALL_ERROR]: [QueryParams.resourceAttributes],
	[ROUTES.ALERTS_NEW]: [QueryParams.resourceAttributes],
	[ROUTES.ALL_CHANNELS]: [QueryParams.resourceAttributes],
	[ROUTES.ALL_DASHBOARD]: [QueryParams.resourceAttributes],
	[ROUTES.APPLICATION]: [QueryParams.resourceAttributes],
	[ROUTES.CHANNELS_EDIT]: [QueryParams.resourceAttributes],
	[ROUTES.CHANNELS_NEW]: [QueryParams.resourceAttributes],
	[ROUTES.DASHBOARD]: [QueryParams.resourceAttributes],
	[ROUTES.DASHBOARD_WIDGET]: [QueryParams.resourceAttributes],
	[ROUTES.EDIT_ALERTS]: [QueryParams.resourceAttributes],
	[ROUTES.ERROR_DETAIL]: [QueryParams.resourceAttributes],
	[ROUTES.HOME_PAGE]: [QueryParams.resourceAttributes],
	[ROUTES.GET_STARTED]: [QueryParams.resourceAttributes],
	[ROUTES.ONBOARDING]: [QueryParams.resourceAttributes],
	[ROUTES.LIST_ALL_ALERT]: [QueryParams.resourceAttributes],
	[ROUTES.LIST_LICENSES]: [QueryParams.resourceAttributes],
	[ROUTES.LOGIN]: [QueryParams.resourceAttributes],
	[ROUTES.LOGS]: [QueryParams.resourceAttributes],
	[ROUTES.LOGS_BASE]: [QueryParams.resourceAttributes],
	[ROUTES.MY_SETTINGS]: [QueryParams.resourceAttributes],
	[ROUTES.NOT_FOUND]: [QueryParams.resourceAttributes],
	[ROUTES.ORG_SETTINGS]: [QueryParams.resourceAttributes],
	[ROUTES.PASSWORD_RESET]: [QueryParams.resourceAttributes],
	[ROUTES.SETTINGS]: [QueryParams.resourceAttributes],
	[ROUTES.SIGN_UP]: [QueryParams.resourceAttributes],
	[ROUTES.SOMETHING_WENT_WRONG]: [QueryParams.resourceAttributes],
	[ROUTES.TRACES_EXPLORER]: [QueryParams.resourceAttributes],
	[ROUTES.TRACE]: [QueryParams.resourceAttributes],
	[ROUTES.TRACE_DETAIL]: [QueryParams.resourceAttributes],
	[ROUTES.UN_AUTHORIZED]: [QueryParams.resourceAttributes],
	[ROUTES.USAGE_EXPLORER]: [QueryParams.resourceAttributes],
	[ROUTES.VERSION]: [QueryParams.resourceAttributes],
	[ROUTES.TRACE_EXPLORER]: [QueryParams.resourceAttributes],
	[ROUTES.LOGS_PIPELINES]: [QueryParams.resourceAttributes],
	[ROUTES.WORKSPACE_LOCKED]: [QueryParams.resourceAttributes],
	[ROUTES.MESSAGING_QUEUES_KAFKA]: [QueryParams.resourceAttributes],
	[ROUTES.MESSAGING_QUEUES_KAFKA_DETAIL]: [QueryParams.resourceAttributes],
	[ROUTES.MESSAGING_QUEUES_CELERY_TASK]: [QueryParams.resourceAttributes],
	[ROUTES.MESSAGING_QUEUES_OVERVIEW]: [QueryParams.resourceAttributes],
	[ROUTES.INFRASTRUCTURE_MONITORING_HOSTS]: [QueryParams.resourceAttributes],
	[ROUTES.INFRASTRUCTURE_MONITORING_KUBERNETES]: [
		QueryParams.resourceAttributes,
	],
};
