/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { GetPublicDashboard200 } from 'api/generated/services/sigNoz.schemas';

/** The public link the dashboard header reads on every load. */
export const publicDashboardMeta = (
	dashboardId: string,
): GetPublicDashboard200 => ({
	status: 'success',
	data: {
		timeRangeEnabled: true,
		defaultTimeRange: '30m',
		publicPath: `/public/dashboard/${dashboardId}`,
	},
});
