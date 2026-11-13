import { getPublicDashboardPanelQueryRangeV2 } from 'api/generated/services/dashboard';
import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	PublicDashboardSchema,
	type ResolvedPublicDashboard,
} from 'hooks/dashboard/useGetResolvedPublicDashboard';
import {
	CHARTS_ONLY,
	withControls,
} from 'pages/DashboardPage/DashboardContainer/controls/presets';
import type { DashboardControlsInput } from 'pages/DashboardPage/DashboardContainer/controls/types';
import type {
	DashboardQuerySource,
	QueryRunner,
} from 'pages/DashboardPage/DashboardContainer/store/slices/editContextSlice';

export interface PublicDashboardHost {
	source: DashboardQuerySource;
	readOnly: true;
	controls: DashboardControlsInput;
	queryRunner: QueryRunner;
	/** The dashboard as mounted: variables removed, keyed by the public id. */
	select: (
		resolved: ResolvedPublicDashboard,
	) => DashboardtypesGettableDashboardV2DTO | undefined;
}

/**
 * Everything a public link needs from the shared dashboard: the resolved data's
 * cache entry, the public panel endpoint, and no editing. Variables are dropped
 * because the public endpoint never substitutes them. Memoise per id.
 */
export function createPublicDashboardHost(
	publicDashboardId: string,
	{ timeRangeEnabled }: { timeRangeEnabled: boolean },
): PublicDashboardHost {
	const select = (
		resolved: ResolvedPublicDashboard,
	): DashboardtypesGettableDashboardV2DTO | undefined => {
		if (
			resolved.schema !== PublicDashboardSchema.V2 ||
			!resolved.data.dashboard
		) {
			return undefined;
		}
		const { dashboard } = resolved.data;
		return {
			...dashboard,
			id: `public:${publicDashboardId}`,
			spec: { ...dashboard.spec, variables: [] },
		};
	};

	return {
		select,
		source: {
			queryKey: [REACT_QUERY_KEY.GET_PUBLIC_DASHBOARD_RESOLVED, publicDashboardId],
			select,
		},
		readOnly: true,
		controls: withControls(
			CHARTS_ONLY,
			timeRangeEnabled
				? { toolbar: { variables: false } }
				: // A fixed link: no way to change the time, including zooming a chart.
					{ toolbar: false, panelActions: { zoom: false } },
		),
		queryRunner: {
			key: `public:${publicDashboardId}`,
			paginates: false,
			// The server holds each panel's query; only the window travels.
			run: ({ panelId, requestPayload, signal }) =>
				getPublicDashboardPanelQueryRangeV2(
					{ id: publicDashboardId, key: panelId },
					{
						startTime: String(requestPayload.start),
						endTime: String(requestPayload.end),
					},
					signal,
				),
		},
	};
}
