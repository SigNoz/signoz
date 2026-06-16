import { Spin } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Loader, TriangleAlert } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import styles from './PanelBody.module.scss';

interface PanelBodyProps {
	/** Resolved renderer for the panel kind — always present (`Panel` renders the
	 * unsupported fallback itself when no renderer is registered). */
	panelDefinition: RenderablePanelDefinition;
	panel: DashboardtypesPanelDTO;
	panelId: string;
	data: PanelQueryData;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
	onDragSelect: (start: number, end: number) => void;
	dashboardPreference: DashboardPreference;
	/** Header search term — only consumed by kinds that declare header search. */
	searchTerm?: string;
}

/**
 * Renders the content of a panel whose kind has a registered renderer, as an
 * explicit state machine so each state is handled deliberately (no implicit
 * fall-through):
 *
 *   error + no data → error message with retry
 *   first load (no data) → loading indicator
 *   otherwise → the kind's renderer (which owns its own "No Data" state, and
 *               keeps stale data mounted during background refetches)
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
	searchTerm,
}: PanelBodyProps): JSX.Element {
	// Surface a hard failure only when there's no (stale) data to show; otherwise
	// keep the last-good chart and let the header indicate the refresh.
	// react-query keeps the previous response during background refetches, so
	// `data.response` presence is the "have something to show" signal.
	const hasData = !!data.response;

	if (error && !hasData) {
		return (
			<div className={styles.error} data-testid="panel-error">
				<TriangleAlert size={20} className={styles.errorIcon} />
				<Typography.Text className={styles.errorMessage}>
					{error.message || 'Failed to load panel data'}
				</Typography.Text>
				<Button variant="outlined" color="secondary" onClick={refetch}>
					Retry
				</Button>
			</div>
		);
	}

	// First load only — background refetches keep the response populated so the
	// chart stays mounted instead of blinking.
	if (isLoading && !hasData) {
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
				panelMode={PanelMode.DASHBOARD_VIEW}
				enableDrillDown={false}
				dashboardPreference={dashboardPreference}
				searchTerm={searchTerm}
			/>
		</div>
	);
}

export default PanelBody;
