import { useMemo, useState } from 'react';
// eslint-disable-next-line no-restricted-imports -- seed initial time from global store; never written back
import { useSelector } from 'react-redux';
import type { DashboardtypesPanelDTO } from 'api/generated/services/sigNoz.schemas';
import getStartEndRangeTime from 'lib/getStartEndRangeTime';
import {
	type PanelQueryTimeOverride,
	type UsePanelQueryResult,
	usePanelQuery,
} from 'pages/DashboardPageV2/DashboardContainer/hooks/usePanelQuery';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

import type { PreviewTime } from './PreviewTimePicker/PreviewTimePicker';

const NS_TO_SEC = 1e9;
const SEC_TO_MS = 1e3;

interface UsePreviewQueryArgs {
	panel: DashboardtypesPanelDTO;
	panelId: string;
	enabled: boolean;
}

export interface UsePreviewQueryResult extends UsePanelQueryResult {
	/** Editor-local time selection (never touches global Redux time or the URL). */
	previewTime: PreviewTime;
	setPreviewTime: (next: PreviewTime) => void;
}

/**
 * Owns the panel editor's preview query and its editor-local time selection. Lifted out
 * of `PreviewPane` so the editor root can share the single query result between the
 * preview and the config pane (e.g. the legend-colors control needs the resolved series).
 *
 * Time is seeded once from the current global selection so the preview opens matching
 * the dashboard, then resolved to an absolute `[startMs, endMs]` window handed to
 * `usePanelQuery` — relative selections are pinned at pick-time so re-renders don't churn
 * the query key into a refetch loop.
 */
export function usePreviewQuery({
	panel,
	panelId,
	enabled,
}: UsePreviewQueryArgs): UsePreviewQueryResult {
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

	const time = useMemo<PanelQueryTimeOverride>(() => {
		if (previewTime.range) {
			return {
				startMs: previewTime.range[0] * SEC_TO_MS,
				endMs: previewTime.range[1] * SEC_TO_MS,
			};
		}
		const { start, end } = getStartEndRangeTime({
			type: 'GLOBAL_TIME',
			interval: previewTime.interval,
		});
		return { startMs: Number(start) * SEC_TO_MS, endMs: Number(end) * SEC_TO_MS };
	}, [previewTime]);

	const result = usePanelQuery({ panel, panelId, enabled, time });

	return { ...result, previewTime, setPreviewTime };
}
