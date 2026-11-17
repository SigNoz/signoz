/**
 * AI-owned. Generated and maintained by coding agents alongside the specs that
 * use it. Do not hand-edit: regenerate it with the spec that needs the change.
 */
// Typed builders for the saved view spec: pure data, no Playwright. The types
// live in `spec.types.ts`.
//
// `/api/v2/saved_views`: create and update take the whole spec, and an update
// replaces it, so a field left out is reset.

import { randomBytes } from 'crypto';

import type {
	LogsViewOptions,
	PostableSavedView,
	SavedViewColumn,
	SavedViewPanelType,
	SavedViewRequestType,
	SeededView,
} from './spec.types';

export const SAVED_VIEWS_API = '/api/v2/saved_views';

const REQUEST_TYPE: Record<SavedViewPanelType, SavedViewRequestType> = {
	list: 'raw',
	graph: 'time_series',
	table: 'scalar',
};

/** Workers and browser projects share one org, so every view name is unique. */
export function uniqueViewName(label: string): string {
	return `e2e sv ${label} ${randomBytes(4).toString('hex')}`;
}

export const LOG_COLUMNS: Record<string, SavedViewColumn> = {
	timestamp: {
		name: 'timestamp',
		signal: 'logs',
		fieldContext: 'log',
		fieldDataType: '',
	},
	body: {
		name: 'body',
		signal: 'logs',
		fieldContext: 'log',
		fieldDataType: '',
	},
	serviceName: {
		name: 'service.name',
		signal: 'logs',
		fieldContext: 'resource',
		fieldDataType: 'string',
	},
	severityText: {
		name: 'severity_text',
		signal: 'logs',
		fieldContext: 'log',
		fieldDataType: 'string',
	},
};

export function logsView({
	displayName,
	filter = '',
	panelType = 'list',
	groupBy = [],
	columns = [LOG_COLUMNS.timestamp, LOG_COLUMNS.body],
	display,
}: LogsViewOptions): PostableSavedView {
	const isList = panelType === 'list';
	return {
		generateName: true,
		source: 'logs',
		schemaVersion: 'v2',
		spec: {
			displayName,
			panelType,
			requestType: REQUEST_TYPE[panelType],
			queries: [
				{
					type: 'builder_query',
					spec: {
						name: 'A',
						signal: 'logs',
						disabled: false,
						filter: { expression: filter },
						...(isList
							? {
									order: [
										{ key: { name: 'timestamp' }, direction: 'desc' },
										{ key: { name: 'id' }, direction: 'desc' },
									],
								}
							: {
									aggregations: [{ expression: 'count()' }],
									groupBy: groupBy.map((name) => ({
										name,
										fieldContext: 'resource',
										fieldDataType: 'string',
									})),
								}),
					},
				},
			],
			selectedFields: isList ? columns : [],
			...(display && { display }),
		},
	};
}

export function seededView(id: string, view: PostableSavedView): SeededView {
	const [query] = view.spec.queries as {
		spec?: { filter?: { expression?: string } };
	}[];
	return {
		id,
		displayName: view.spec.displayName,
		filter: query?.spec?.filter?.expression ?? '',
		requestType: view.spec.requestType,
	};
}
