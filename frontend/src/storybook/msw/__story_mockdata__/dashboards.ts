/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ListDashboardsForUserV2200 } from 'api/generated/services/sigNoz.schemas';
import { DashboardtypesSourceDTO } from 'api/generated/services/sigNoz.schemas';

/**
 * The dashboards every explorer offers to export a panel into. Only the name
 * reaches the export menu, so the rest of a dashboard is the shape the endpoint
 * answers with and nothing more.
 */
export const dashboardsForUserResponse = (
	names: readonly string[],
): ListDashboardsForUserV2200 => ({
	status: 'success',
	data: {
		total: names.length,
		reservedKeywords: [],
		tags: [],
		dashboards: names.map((name, index) => ({
			id: `storybook-dashboard-${index + 1}`,
			orgId: 'storybook-org',
			name,
			spec: { display: { name } },
			schemaVersion: 'v2',
			source: DashboardtypesSourceDTO.user,
			legacy: false,
			locked: false,
			pinned: false,
			tags: [],
			createdBy: 'ada@signoz.io',
			updatedBy: 'ada@signoz.io',
		})),
	},
});
