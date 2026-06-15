import { Spin } from 'antd';
import { Loader, Spline } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { DEFAULT_TIME_RANGE } from 'container/TopNav/DateTimeSelectionV2/constants';
import type { RenderablePanelDefinition } from 'pages/DashboardPageV2/DashboardContainer/Panels/types/panelDefinition';
import type { PanelQueryData } from 'pages/DashboardPageV2/DashboardContainer/queryV5/types';
import { EQueryType } from 'types/common/dashboard';

import type {
	PreviewTimeRange,
	UsePreviewQueryResult,
} from '../usePreviewQuery';

import styles from './PreviewPane.module.scss';

interface PreviewPaneProps {
	panelId: string;
	panel: DashboardtypesPanelDTO;
	/** Resolved definition for the panel kind; undefined when the kind is unsupported. */
	panelDef: RenderablePanelDefinition | undefined;
	data: PanelQueryData;
	isLoading: boolean;
	error: Error | null;
	/** Editor-local time selection (never touches global Redux time or the URL). */
	selectedInterval: UsePreviewQueryResult['selectedInterval'];
	timeRange: PreviewTimeRange;
	onTimeChange: UsePreviewQueryResult['onTimeChange'];
}

/**
 * Live preview for the panel editor. Presentational: the draft panel renders through the
 * same registry the dashboard grid uses (`panelDef.Renderer`), so the preview is the
 * production renderer — only `panelMode` differs (DASHBOARD_EDIT). The query + editor-local
 * time are owned by the editor root (`usePreviewQuery`) and passed in, so the same result
 * is shared with the config pane.
 */
function PreviewPane({
	panelId,
	panel,
	panelDef,
	data,
	isLoading,
	error,
	selectedInterval,
	timeRange,
	onTimeChange,
}: PreviewPaneProps): JSX.Element {
	return (
		<div className={styles.preview}>
			<div className={styles.header}>
				<div className={styles.queryType}>
					<Spline size={14} />
					Plotted with <QueryTypeTag queryType={EQueryType.QUERY_BUILDER} />
				</div>
				{/* Shared time picker in modal mode: edits a local window via onTimeChange
				    and never touches global Redux time or the URL (disableUrlSync). */}
				<DateTimeSelectionV2
					showAutoRefresh
					showRefreshText={false}
					hideShareModal
					disableUrlSync
					isModalTimeSelection
					defaultRelativeTime={DEFAULT_TIME_RANGE}
					onTimeChange={onTimeChange}
					modalSelectedInterval={selectedInterval}
					modalInitialStartTime={timeRange.startMs}
					modalInitialEndTime={timeRange.endMs}
				/>
			</div>
			<div className={styles.container}>
				<div className={styles.surface}>
					{/* eslint-disable-next-line no-nested-ternary -- 3-way branch on render state */}
					{!panelDef ? (
						<div className={styles.state} data-testid="panel-editor-v2-unknown-kind">
							This panel type is not yet supported in V2.
						</div>
					) : isLoading && !data.response ? (
						<div className={styles.state} data-testid="panel-editor-v2-loading">
							<Spin indicator={<Loader size={14} className="animate-spin" />} />
						</div>
					) : (
						<panelDef.Renderer
							panelId={panelId}
							panel={panel}
							data={data}
							isLoading={isLoading}
							error={error}
							panelMode={PanelMode.DASHBOARD_EDIT}
							enableDrillDown={false}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

export default PreviewPane;
