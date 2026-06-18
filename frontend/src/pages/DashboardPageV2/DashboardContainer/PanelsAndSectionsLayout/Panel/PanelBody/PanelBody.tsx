import { Spin } from 'antd';
import { Loader, RotateCw, SquarePlus, TriangleAlert } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import PanelMessage from 'pages/DashboardPageV2/DashboardContainer/Panels/components/PanelMessage/PanelMessage';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { DashboardPreference } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/rendererProps';
import { hasRunnableQueries } from 'pages/DashboardPageV2/DashboardContainer/queryV5/buildQueryRangeRequest';
import type {
	PanelPagination,
	PanelQueryData,
} from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';

import { panelStatusFromError } from '../PanelStatus/utils';
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
	panelMode = PanelMode.DASHBOARD_VIEW,
	searchTerm,
	pagination,
}: PanelBodyProps): JSX.Element {
	// Surface a hard failure only when there's no (stale) data to show; otherwise
	// keep the last-good chart and let the header indicate the refresh.
	// react-query keeps the previous response during background refetches, so
	// `data.response` presence is the "have something to show" signal.
	const hasData = !!data.response;

	// Not-configured panel: nothing was ever queried (no runnable query in the
	// spec), so there's no error/loading to show — prompt the user to add one.
	if (!hasRunnableQueries(panel.spec.queries ?? [])) {
		return (
			<PanelMessage
				icon={<SquarePlus size={18} />}
				title="Nothing to visualize yet"
				description="This panel has no query. Add one to start plotting data."
				data-testid="panel-no-query"
			/>
		);
	}

	if (error && !hasData) {
		// Parse the API error the same way the header status popover does, so the
		// body shows the backend's message (not the raw axios "status code 4xx").
		const errorDetail = panelStatusFromError(error);
		return (
			<PanelMessage
				icon={<TriangleAlert size={18} />}
				tone="danger"
				title="Couldn’t load panel data"
				description={errorDetail?.message || 'Something went wrong while fetching.'}
				action={{
					label: 'Retry',
					onClick: refetch,
					icon: <RotateCw size={14} />,
				}}
				data-testid="panel-error"
			/>
		);
	}

	// First load only — background refetches keep the response populated so the
	// chart stays mounted instead of blinking.
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
				refetch={refetch}
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
