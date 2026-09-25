import { useState } from 'react';
import { Grid2X2 } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import logEvent from 'api/common/logEvent';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ExportPanelContainer from 'container/ExportPanel/ExportPanelContainer';
import { ExportDashboard } from 'hooks/dashboard/useExportDashboards';
import { useGetExportToDashboardLink } from 'hooks/dashboard/useGetExportToDashboardLink';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { v4 } from 'uuid';

import { EXPLORER_ACTION_EVENTS, getExportPanelType } from './utils';

function AddToDashboardButton({
	query,
	sourcepage,
	panelType,
}: {
	query: Query | null;
	sourcepage: DataSource;
	panelType?: PANEL_TYPES;
}): JSX.Element {
	const [queryToExport, setQueryToExport] = useState<Query | null>(null);
	const { panelType: contextPanelType } = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();
	const getExportToDashboardLink = useGetExportToDashboardLink();

	const open = (): void => {
		if (!query) {
			return;
		}
		void logEvent(EXPLORER_ACTION_EVENTS.addToDashboard, {
			sourcepage,
			panelType: contextPanelType,
		});
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

		void logEvent(EXPLORER_ACTION_EVENTS.exported, {
			sourcepage,
			panelType: exportPanelType,
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

	const button = (
		<Button
			variant="ghost"
			color="secondary"
			size="icon"
			disabled={!query}
			onClick={open}
			prefix={<Grid2X2 size={16} />}
			aria-label="Add to dashboard"
			data-testid="explorer-add-to-dashboard"
		/>
	);

	return (
		<>
			<TooltipSimple title="Add to dashboard">{button}</TooltipSimple>
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
