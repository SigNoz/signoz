import { generatePath } from 'react-router-dom';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import { serialize } from 'lib/compositeQuery/serializer';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

type GenerateExportToDashboardLinkParams = {
	dashboardId: string;
	panelType: PANEL_TYPES;
	query: Query;
	widgetId: string;
};

export const generateExportToDashboardLink = ({
	query,
	dashboardId,
	panelType,
	widgetId,
}: GenerateExportToDashboardLinkParams): string =>
	`${generatePath(ROUTES.DASHBOARD, {
		dashboardId,
	})}/new?${QueryParams.graphType}=${panelType}&${
		QueryParams.widgetId
	}=${widgetId}&${serialize(query).toString()}`;
