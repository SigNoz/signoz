import { Spin } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Loader, TriangleAlert } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
import type {
	PanelPagination,
	PanelQueryData,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { panelStatusFromError } from '../PanelStatus/utils';
import styles from './PanelBody.module.scss';

interface PanelBodyProps {
	/** Resolved renderer for the panel kind — always present (`Panel` renders the
	 * unsupported fallback itself when none is registered). */
	panelDefinition: RenderablePanelDefinition;
	panel: DashboardtypesPanelDTO;
	panelId: string;
	data: PanelQueryData;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
	onDragSelect: (start: number, end: number) => void;
	/** Dashboard-wide preferences (cursor sync, …); absent in the editor preview. */
	dashboardPreference?: DashboardPreference;
	/** Render context — defaults to the dashboard view; the editor preview passes EDIT. */
	panelMode?: PanelMode;
	/** Header search term — only consumed by kinds that declare header search. */
	searchTerm?: string;
	/** Server-side paging handles — only consumed by raw/list renderers. */
	pagination?: PanelPagination;
}

/**
 * Renders a panel whose kind has a registered renderer, as an explicit state
 * machine:
 *
 *   error + no data → error message with retry
 *   first load (no data) → loading indicator
 *   otherwise → the kind's renderer (owns its own "No Data" state and keeps
 *               stale data mounted during background refetches)
 */
function PanelBody({
	panelDefinition,
	panel,
	panelId,
	data,
	isLoading,
	error,
	refetch,
	onDragSelect,
	dashboardPreference,
	panelMode = PanelMode.DASHBOARD_VIEW,
	searchTerm,
	pagination,
}: PanelBodyProps): JSX.Element {
	// react-query keeps the previous response during background refetches, so
	// `data.response` presence is the "have something to show" signal — surface a
	// hard failure only when there's nothing to keep on screen.
	const hasData = !!data.response;

	if (error && !hasData) {
		// Parse the API error like the header popover does, so the body shows the
		// backend message (not the raw axios "status code 4xx").
		const errorDetail = panelStatusFromError(error);
		return (
			<div className={styles.error} data-testid="panel-error">
				<TriangleAlert size={20} className={styles.errorIcon} />
				<Typography.Text className={styles.errorMessage}>
					{errorDetail?.message || 'Failed to load panel data'}
				</Typography.Text>
				<Button variant="outlined" color="secondary" onClick={refetch}>
					Retry
				</Button>
			</div>
		);
	}

	// First load only — refetches keep the response populated so the chart stays
	// mounted instead of blinking.
	if (isLoading) {
		return (
			<div className={styles.body} data-testid="panel-loading">
				<Spin indicator={<Loader size={14} className="animate-spin" />} />
			</div>
		);
	}

	return (
		<div className={styles.chartContainer}>
			<panelDefinition.Renderer
				panelId={panelId}
				panel={panel}
				data={data}
				isLoading={isLoading}
				error={error}
				onDragSelect={onDragSelect}
				panelMode={panelMode}
				enableDrillDown={false}
				dashboardPreference={dashboardPreference}
				searchTerm={searchTerm}
				pagination={pagination}
			/>
		</div>
	);
}

export default PanelBody;
