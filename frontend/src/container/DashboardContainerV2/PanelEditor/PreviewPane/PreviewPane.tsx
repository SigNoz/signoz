import { Spin } from 'antd';
import { Loader, Spline } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { getPanelDefinition } from 'container/DashboardContainerV2/Panels';
import { usePanelQuery } from 'container/DashboardContainerV2/hooks/usePanelQuery';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import DateTimeSelectionV2 from 'container/TopNav/DateTimeSelectionV2';
import { EQueryType } from 'types/common/dashboard';

import styles from './PreviewPane.module.scss';

interface PreviewPaneProps {
	panelId: string;
	panel: DashboardtypesPanelDTO;
}

/**
 * Live preview for the panel editor. Renders the draft panel through the same
 * registry + query path the dashboard grid uses (`getPanelDefinition` +
 * `usePanelQuery`), so the preview is byte-for-byte the production renderer —
 * only the `panelMode` differs (DASHBOARD_EDIT). As the draft changes, the
 * preview re-fetches and re-renders automatically.
 */
function PreviewPane({ panelId, panel }: PreviewPaneProps): JSX.Element {
	const fullKind = panel.spec?.plugin?.kind;
	const panelDef = getPanelDefinition(fullKind);

	const { data, isLoading, error } = usePanelQuery({
		panel,
		panelId,
		enabled: !!panelDef,
	});

	return (
		<div className={styles.preview}>
			<div className={styles.header}>
				<div className={styles.queryType}>
					<Spline size={14} />
					Plotted with <QueryTypeTag queryType={EQueryType.QUERY_BUILDER} />
				</div>
				<DateTimeSelectionV2 showAutoRefresh={false} hideShareModal />
			</div>
			<div className={styles.container}>
				<div className={styles.surface}>
					{/* eslint-disable-next-line no-nested-ternary -- 3-way branch on render state */}
					{!panelDef ? (
						<div className={styles.state} data-testid="panel-editor-v2-unknown-kind">
							This panel type is not yet supported in V2.
						</div>
					) : isLoading && !data ? (
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
