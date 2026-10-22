import { BarChart, Grid3X3, ScrollText } from '@signozhq/icons';
import { ATTRIBUTE_TYPES } from 'constants/queryBuilder';

import { QueryBuilderField } from '../../queryBuilderFields.types';

import type { AddOn, AddOnDefinition, AddOnField } from './types';

export const ADD_ON_TOOLTIP_DELAY_MS = 500;

// A Record, so a field added to the enum has to be placed here or in `NonAddOnField`.
export const ADD_ON_DEFINITIONS = {
	[QueryBuilderField.GroupBy]: {
		input: true,
		icon: <BarChart size={14} />,
		label: 'Group By',
		queryPath: 'groupBy',
		placeholder: 'Everything (no breakdown)',
		description:
			'Break down data by attributes like service name, endpoint, status code, or region. Essential for spotting patterns and comparing performance across different segments.',
		docLink: 'https://signoz.io/docs/querying/aggregation-grouping/#grouping',
	},
	[QueryBuilderField.Having]: {
		input: true,
		icon: <ScrollText size={14} />,
		label: 'Having',
		queryPath: 'having.expression',
		placeholder: 'Type Having query like count() > 10 ...',
		description:
			'Filter grouped results based on aggregate conditions. Show only groups meeting specific criteria, like error rates > 5% or p99 latency > 500',
		docLink:
			'https://signoz.io/docs/querying/result-manipulation/#conditional-filtering-with-having',
	},
	[QueryBuilderField.OrderBy]: {
		input: true,
		icon: <ScrollText size={14} />,
		label: 'Order By',
		queryPath: 'orderBy',
		placeholder: 'Select fields to order by',
		description:
			'Sort results to surface what matters most. Quickly identify slowest operations, most frequent errors, or highest resource consumers.',
		docLink:
			'https://signoz.io/docs/querying/result-manipulation/#sorting--limiting',
	},
	[QueryBuilderField.Limit]: {
		input: true,
		icon: <ScrollText size={14} />,
		label: 'Limit',
		queryPath: 'limit',
		placeholder: 'Enter limit',
		description:
			'Show only the top/bottom N results. Perfect for focusing on outliers, reducing noise, and improving dashboard performance.',
		docLink:
			'https://signoz.io/docs/querying/result-manipulation/#how-limit-works-for-time-series',
	},
	[QueryBuilderField.Legend]: {
		input: true,
		icon: <ScrollText size={14} />,
		label: 'Legend format',
		queryPath: 'legend',
		placeholder: 'Write legend format',
		description:
			'Customize series labels using variables like {{service.name}}-{{endpoint}}. Makes charts readable at a glance during incident investigation.',
		docLink:
			'https://signoz.io/docs/querying/aggregation-grouping/#legend-formatting',
	},
	[QueryBuilderField.ReduceTo]: {
		input: false,
		icon: <ScrollText size={14} />,
		label: 'Reduce to',
		queryPath: 'reduceTo',
		description:
			'Apply mathematical operations like sum, average, min, max, or percentiles to reduce multiple time series into a single value.',
		docLink:
			'https://signoz.io/docs/userguide/query-builder-v5/#result-manipulation',
	},
	[QueryBuilderField.BucketOptions]: {
		input: false,
		icon: <Grid3X3 size={14} />,
		label: 'Bucket by',
		queryPath: 'bucketOptions',
		description:
			'Choose how the bucket axis is spaced — logarithmically, so every band is the same height and the tail stays readable, or linearly up to a max value. Left to Auto, the query picks the finest log axis it can return.',
		docLink: 'https://signoz.io/docs/userguide/query-builder-v5/',
	},
} as const satisfies Record<AddOnField, AddOnDefinition>;

export type InputAddOnField = {
	[K in AddOnField]: (typeof ADD_ON_DEFINITIONS)[K] extends { input: true }
		? K
		: never;
}[AddOnField];

const toAddOn = (key: AddOnField): AddOn => ({
	key,
	...ADD_ON_DEFINITIONS[key],
});

export const BASE_ADD_ONS = (
	[
		QueryBuilderField.GroupBy,
		QueryBuilderField.Having,
		QueryBuilderField.OrderBy,
		QueryBuilderField.Limit,
		QueryBuilderField.Legend,
	] as const satisfies readonly AddOnField[]
).map(toAddOn);

export const REDUCE_TO = toAddOn(QueryBuilderField.ReduceTo);

// Offered only by a heatmap over metrics: the bucket axis is what a heatmap plots
// against, and no other panel type sends one. A histogram brings its own buckets.
export const HISTOGRAM_ATTRIBUTE_TYPES = new Set<string>([
	ATTRIBUTE_TYPES.HISTOGRAM,
	ATTRIBUTE_TYPES.EXPONENTIAL_HISTOGRAM,
]);

export const BUCKET_OPTIONS = toAddOn(QueryBuilderField.BucketOptions);
