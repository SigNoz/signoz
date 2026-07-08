import { GeneratedAPIInstance } from 'api/generatedAPIInstance';
import type { GetPublicDashboardPanelQueryRangeV2200 } from 'api/generated/services/sigNoz.schemas';

export interface GetPublicDashboardPanelQueryRangeProps {
	/** Public share id from the URL. */
	id: string;
	/** Panel key in `spec.panels`. */
	key: string;
	/** Epoch milliseconds. */
	startTime: number;
	/** Epoch milliseconds. */
	endTime: number;
}

/**
 * Query-range data for a single panel of a v2 (Perses-spec) public dashboard, addressed by its
 * key in `spec.panels`.
 *
 * The generated `getPublicDashboardPanelQueryRangeV2` fetcher omits the `startTime`/`endTime`
 * query params the endpoint reads, so we call the shared generated axios instance directly and
 * append them. Times are epoch milliseconds; the backend honours them only when the publisher
 * enabled the dashboard's time range, otherwise it serves the stored default range.
 */
export const getPublicDashboardPanelQueryRange = (
	{ id, key, startTime, endTime }: GetPublicDashboardPanelQueryRangeProps,
	signal?: AbortSignal,
): Promise<GetPublicDashboardPanelQueryRangeV2200> =>
	GeneratedAPIInstance<GetPublicDashboardPanelQueryRangeV2200>({
		url: `/api/v2/public/dashboards/${id}/panels/${key}/query_range`,
		method: 'GET',
		params: { startTime, endTime },
		signal,
	});
