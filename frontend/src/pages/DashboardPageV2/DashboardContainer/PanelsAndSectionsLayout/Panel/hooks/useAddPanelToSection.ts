import { useCallback } from 'react';
import { v4 as uuid } from 'uuid';

import { patchDashboardV2 } from 'api/generated/services/dashboard';
import { useErrorModal } from 'providers/ErrorModalProvider';
import APIError from 'types/api/error';

import {
	addPanelToSectionOps,
	createDefaultPanel,
	panelRef,
} from '../../../patchOps';
import { useDashboardStore } from '../../../store/useDashboardStore';
import type { DashboardSection } from '../../../utils';

interface Params {
	sections: DashboardSection[];
}

export interface AddPanelArgs {
	layoutIndex: number;
	pluginKind: string;
}

/**
 * Creates a new panel and places its item ref at the bottom of the target
 * section, as one atomic patch. Structure-only: the panel is a valid minimal
 * placeholder (its query is filled in once the panel editor lands).
 */
export function useAddPanelToSection({
	sections,
}: Params): (args: AddPanelArgs) => Promise<void> {
	const dashboardId = useDashboardStore((s) => s.dashboardId);
	const refetch = useDashboardStore((s) => s.refetch);
	const { showErrorModal } = useErrorModal();

	return useCallback(
		async ({ layoutIndex, pluginKind }: AddPanelArgs): Promise<void> => {
			const target = sections.find((s) => s.layoutIndex === layoutIndex);
			if (!target) {
				return;
			}

			const panelId = uuid();
			const nextY = target.items.reduce(
				(max, i) => Math.max(max, i.y + i.height),
				0,
			);

			try {
				await patchDashboardV2(
					{ id: dashboardId },
					addPanelToSectionOps({
						panelId,
						panel: createDefaultPanel(pluginKind),
						layoutIndex,
						item: {
							x: 0,
							y: nextY,
							width: 6,
							height: 6,
							content: { $ref: panelRef(panelId) },
						},
					}),
				);
				refetch();
			} catch (error) {
				showErrorModal(error as APIError);
			}
		},
		[sections, dashboardId, refetch, showErrorModal],
	);
}
