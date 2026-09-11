/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type {
	DashboardtypesGettableDashboardV2DTO,
	GetPublicDashboardDataV2200,
} from 'api/generated/services/sigNoz.schemas';

/** The two shapes a published link can resolve to. */
export const PUBLIC_SCHEMAS = ['v2', 'v1'] as const;

export type PublicSchema = (typeof PUBLIC_SCHEMAS)[number];

export const publicDashboardV2Response = (
	dashboard: DashboardtypesGettableDashboardV2DTO,
	timeRangeEnabled: boolean,
): GetPublicDashboardDataV2200 => ({
	status: 'success',
	data: {
		dashboard,
		publicDashboard: {
			timeRangeEnabled,
			defaultTimeRange: '30m',
			publicPath: `/public/dashboard/${dashboard.id}`,
		},
	},
});

/**
 * The only v2 failure the page reads as "this is a v1 dashboard"; every other
 * error re-throws instead of mis-rendering the older viewer.
 */
export const SCHEMA_MISMATCH_ERROR = {
	status: 'error',
	error: {
		code: 'dashboard_invalid_data',
		message: 'dashboard is not stored in the v6 schema',
		url: '',
		errors: [],
	},
};

export const UNPUBLISHED_ERROR = {
	status: 'error',
	error: {
		code: 'public_dashboard_not_found',
		message: 'public dashboard not found',
		url: '',
		errors: [],
	},
};
