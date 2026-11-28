import { useState } from 'react';
import { Grid2X2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Tooltip } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ExportPanelContainer from 'container/ExportPanel/ExportPanelContainer';
import { ExportDashboard } from 'hooks/dashboard/useExportDashboards';
import { useGetExportToDashboardLink } from 'hooks/dashboard/useGetExportToDashboardLink';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 } from 'uuid';

import {
	EXPLORER_ACTION_EVENTS,
	ExplorerActionsSource,
	getExplorerActionEventPayload,
	getExportPanelType,
} from './utils';

function AddToDashboardButton({
	query,
	sourcePage,
	panelType,
	isOneChartPerQuery = false,
}: {
	query: Query | null;
	sourcePage: ExplorerActionsSource;
	panelType?: PANEL_TYPES;
	isOneChartPerQuery?: boolean;
}): JSX.Element {
	const [queryToExport, setQueryToExport] = useState<Query | null>(null);
	const { panelType: contextPanelType } = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();
	const getExportToDashboardLink = useGetExportToDashboardLink();

	const open = (): void => {
		if (!query) {
			return;
		}
		void logEvent(
			EXPLORER_ACTION_EVENTS[sourcePage].addToDashboard,
			getExplorerActionEventPayload({
				sourcePage,
				panelType: contextPanelType,
				isOneChartPerQuery,
			}),
		);
		setQueryToExport(query);
	};

	const handleExport = (
		dashboard: ExportDashboard | null,
		isNewDashboard?: boolean,
	): void => {
		if (!dashboard || !queryToExport) {
			return;
		}
		const exportPanelType = panelType ?? getExportPanelType(contextPanelType);

		void logEvent(EXPLORER_ACTION_EVENTS[sourcePage].exported, {
			...getExplorerActionEventPayload({
				sourcePage,
				panelType: contextPanelType,
				isOneChartPerQuery,
			}),
			isNewDashboard,
			dashboardName: dashboard.title,
		});

		const link = getExportToDashboardLink({
			query: queryToExport,
			panelType: exportPanelType,
			dashboardId: dashboard.id,
			widgetId: v4(),
		});
		if (link) {
			safeNavigate(link);
		}
	};

	return (
		<>
			<Tooltip title="Add to dashboard">
				<Button
					variant="ghost"
					color="secondary"
					size="sm"
					icon
					disabled={!query}
					disabledTooltip="Run a query first"
					onClick={open}
					aria-label="Add to dashboard"
					testId="explorer-add-to-dashboard"
				>
					<Grid2X2 size={16} />
				</Button>
			</Tooltip>
			<ExportPanelContainer
				open={queryToExport !== null}
				onClose={(): void => setQueryToExport(null)}
				query={queryToExport}
				onExport={handleExport}
			/>
		</>
	);
}

export default AddToDashboardButton;
