/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import {
	type ListSavedViews200,
	Querybuildertypesv5QueryBuilderQueryGithubComSigNozSignozPkgTypesQuerybuildertypesQuerybuildertypesv5LogAggregationDTOSignal as LogsSignal,
	Querybuildertypesv5QueryEnvelopeBuilderDTOType,
	Querybuildertypesv5RequestTypeDTO,
	SavedviewtypesPanelTypeDTO,
	SavedviewtypesSchemaVersionDTO,
	SavedviewtypesSourceDTO,
} from 'api/generated/services/sigNoz.schemas';

const VIEWS: { name: string; createdBy: string }[] = [
	{ name: 'Checkout errors', createdBy: 'ada@signoz.io' },
	{ name: 'Auth service warnings', createdBy: 'ada@signoz.io' },
	{ name: 'Slow SQL statements', createdBy: 'grace@signoz.io' },
	{ name: 'Payment webhooks', createdBy: 'grace@signoz.io' },
	{ name: 'Rate limited requests', createdBy: 'alan@signoz.io' },
	{ name: 'Cron job failures', createdBy: 'alan@signoz.io' },
	{ name: 'Cold start traces', createdBy: 'alan@signoz.io' },
	{ name: 'Kafka consumer lag', createdBy: 'ada@signoz.io' },
];

export const SAVED_VIEW_MAX = VIEWS.length;

export const logsSavedViewsResponse = (count: number): ListSavedViews200 => ({
	status: 'success',
	data: VIEWS.slice(0, count).map(({ name, createdBy }, index) => {
		const timestamp = `2026-08-${String(4 + index).padStart(2, '0')}T09:24:11Z`;

		return {
			id: `storybook-logs-view-${index + 1}`,
			name: `storybook-logs-view-${index + 1}`,
			source: SavedviewtypesSourceDTO.logs,
			schemaVersion: SavedviewtypesSchemaVersionDTO.v2,
			createdAt: timestamp,
			createdBy,
			updatedAt: timestamp,
			updatedBy: createdBy,
			spec: {
				displayName: name,
				panelType: SavedviewtypesPanelTypeDTO.list,
				requestType: Querybuildertypesv5RequestTypeDTO.raw,
				queries: [
					{
						type: Querybuildertypesv5QueryEnvelopeBuilderDTOType.builder_query,
						spec: { name: 'A', signal: LogsSignal.logs },
					},
				],
			},
		};
	}),
});
