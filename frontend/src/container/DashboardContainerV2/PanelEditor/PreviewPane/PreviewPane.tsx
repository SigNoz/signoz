import { useMemo, useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- seed initial time from global store; never written back
import { useSelector } from 'react-redux';
import { Spin } from 'antd';
import { Loader, Spline } from '@signozhq/icons';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import { PanelMode } from 'container/DashboardContainer/visualization/panels/types';
import { getPanelDefinition } from 'container/DashboardContainerV2/Panels';
import {
	type PanelQueryTimeOverride,
	usePanelQuery,
} from 'container/DashboardContainerV2/hooks/usePanelQuery';
import QueryTypeTag from 'container/NewWidget/LeftContainer/QueryTypeTag';
import { AppState } from 'store/reducers';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';

import PreviewTimePicker, {
	type PreviewTime,
} from '../PreviewTimePicker/PreviewTimePicker';

import styles from './PreviewPane.module.scss';

const NS_TO_SEC = 1e9;

interface PreviewPaneProps {
	panelId: string;
	panel: DashboardtypesPanelDTO;
}

/**
 * Live preview for the panel editor. Renders the draft panel through the same
 * registry + query path the dashboard grid uses (`getPanelDefinition` +
 * `usePanelQuery`), so the preview is byte-for-byte the production renderer —
 * only the `panelMode` differs (DASHBOARD_EDIT).
 *
 * Time is editor-local (`PreviewTimePicker` never touches global Redux time or
 * the URL), so changing it here neither modifies nor re-runs the dashboard
 * behind the overlay. Seeded once from the current global selection so the
 * preview opens matching the dashboard.
 */
function PreviewPane({ panelId, panel }: PreviewPaneProps): JSX.Element {
	const fullKind = panel.spec?.plugin?.kind;
	const panelDef = getPanelDefinition(fullKind);

	const globalTime = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const [previewTime, setPreviewTime] = useState<PreviewTime>(() =>
		globalTime.selectedTime === 'custom'
			? {
					interval: 'custom',
					range: [
						Math.floor(globalTime.minTime / NS_TO_SEC),
						Math.floor(globalTime.maxTime / NS_TO_SEC),
					],
				}
			: { interval: globalTime.selectedTime, range: null },
	);

	const time = useMemo<PanelQueryTimeOverride>(
		() => ({
			selectedTime: 'GLOBAL_TIME',
			interval: previewTime.interval,
			startTime: previewTime.range?.[0],
			endTime: previewTime.range?.[1],
		}),
		[previewTime],
	);

	const { data, isLoading, error } = usePanelQuery({
		panel,
		panelId,
		enabled: !!panelDef,
		time,
	});

	return (
		<div className={styles.preview}>
			<div className={styles.header}>
				<div className={styles.queryType}>
					<Spline size={14} />
					Plotted with <QueryTypeTag queryType={EQueryType.QUERY_BUILDER} />
				</div>
				<PreviewTimePicker value={previewTime} onChange={setPreviewTime} />
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
