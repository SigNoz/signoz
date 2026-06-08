import { Spin } from 'antd';
import { Button } from '@signozhq/ui/button';
import { Typography } from '@signozhq/ui/typography';
import { Loader, TriangleAlert } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import type {
	DashboardPreference,
	RenderablePanelDefinition,
} from 'pages/DashboardPageV2/DashboardContainer/Panels/types';
import type { MetricQueryRangeSuccessResponse } from 'types/api/metrics/getQueryRange';

import styles from './Panel.module.scss';

interface PanelBodyProps {
	/** Resolved renderer for the panel kind; undefined when the kind is unknown. */
	panelDef: RenderablePanelDefinition | undefined;
	panel: DashboardtypesPanelDTO | undefined;
	panelId: string;
	kind: string;
	queryCount: number;
	data: MetricQueryRangeSuccessResponse | undefined;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
	onDragSelect: (start: number, end: number) => void;
	dashboardPreference: DashboardPreference;
}

/**
 * Renders the panel content as an explicit state machine so each state is
 * handled deliberately (no implicit fall-through):
 *
 *   unknown-kind → unsupported fallback
 *   error + no data → error message with retry
 *   first load (no data) → loading indicator
 *   otherwise → the kind's renderer (which owns its own "No Data" state, and
 *               keeps stale data mounted during background refetches)
 */
function PanelBody({
	panelDef,
	panel,
	panelId,
	kind,
	queryCount,
	data,
	isLoading,
	error,
	refetch,
	onDragSelect,
	dashboardPreference,
}: PanelBodyProps): JSX.Element {
	if (!panelDef) {
		return (
			<div className={styles.body} data-testid="panel-unknown-kind-fallback">
				<div>
					<div className={styles.bodyKind}>{kind} panel</div>
					<div>
						{queryCount} {queryCount === 1 ? 'query' : 'queries'} · not yet supported
						in V2
					</div>
				</div>
			</div>
		);
	}

	// Surface a hard failure only when there's no (stale) data to show; otherwise
	// keep the last-good chart and let the header indicate the refresh.
	if (error && !data) {
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

	// First load only — background refetches keep `data` populated so the chart
	// stays mounted instead of blinking.
	if (isLoading && !data) {
		return (
			<div className={styles.body} data-testid="panel-loading">
				<Spin indicator={<Loader size={14} className="animate-spin" />} />
			</div>
		);
	}

	return (
		<div className={styles.chartBody}>
			<panelDef.Renderer
				panelId={panelId}
				panel={panel}
				data={data}
				isLoading={isLoading}
				error={error}
				onDragSelect={onDragSelect}
				panelMode={PanelMode.DASHBOARD_VIEW}
				enableDrillDown={false}
				dashboardPreference={dashboardPreference}
			/>
		</div>
	);
}

export default PanelBody;
