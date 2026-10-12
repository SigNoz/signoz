/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import type { ILog } from 'types/api/logs/log';
import type {
	HistoryData,
	Pipeline,
	PipelineData,
	ProcessorData,
} from 'types/api/pipeline/def';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import type { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

/**
 * What the API sends. The change-history column renders the lowercase spelling,
 * so a version's stage stays blank there: see the story's PR.
 */
export const DEPLOY_STATUSES = [
	'DEPLOYED',
	'IN_PROGRESS',
	'FAILED',
	'DIRTY',
	'UNKNOWN',
] as const;

export type DeployStatus = (typeof DEPLOY_STATUSES)[number];

const DEPLOY_RESULTS: Record<DeployStatus, string> = {
	DEPLOYED: 'deploy success',
	IN_PROGRESS: 'deployment started',
	FAILED: 'collector rejected the config: unknown processor "grok_parser"',
	DIRTY: 'config on the collector is older than this version',
	UNKNOWN: '',
};

const filterOn = (key: string, value: string): TagFilter => ({
	op: 'AND',
	items: [
		{
			id: `${key}-${value}`,
			key: { key, dataType: DataTypes.String, type: '' },
			op: '=',
			value,
		},
	],
});

type ProcessorSeed = Omit<ProcessorData, 'orderId' | 'id' | 'output'>;

const PROCESSORS: ProcessorSeed[] = [
	{
		type: 'grok_parser',
		name: 'Parse the access log line',
		enabled: true,
		pattern: '%{COMMONAPACHELOG}',
		parse_from: 'body',
		parse_to: 'attributes',
		on_error: 'send',
	},
	{
		type: 'json_parser',
		name: 'Parse the JSON payload',
		enabled: true,
		parse_from: 'body',
		parse_to: 'attributes',
		enable_flattening: true,
		enable_paths: false,
		path_prefix: '',
		mapping: {},
	},
	{
		type: 'severity_parser',
		name: 'Read severity off level',
		enabled: true,
		parse_from: 'attributes.level',
	},
	{
		type: 'move',
		name: 'Rename auth to username',
		enabled: true,
		from: 'attributes.auth',
		to: 'attributes.username',
	},
	{
		type: 'remove',
		name: 'Drop the raw payload',
		enabled: false,
		field: 'attributes.payload',
	},
];

export const PROCESSOR_MAX = PROCESSORS.length;

/**
 * `output` chains each processor to the next one, which is what cancelling an
 * edit rebuilds the list from.
 */
const processorsFor = (pipelineId: string, count: number): ProcessorData[] => {
	const ids = PROCESSORS.slice(0, count).map(
		(_unused, index) => `${pipelineId}-processor-${index + 1}`,
	);

	return PROCESSORS.slice(0, count).map((processor, index) => ({
		...processor,
		id: ids[index],
		orderId: index + 1,
		output: ids[index + 1],
	}));
};

interface PipelineSeed {
	name: string;
	description: string;
	filter: TagFilter;
}

const PIPELINES: PipelineSeed[] = [
	{
		name: 'Parse nginx access logs',
		description: 'grok the access log line into attributes',
		filter: filterOn('source', 'nginx'),
	},
	{
		name: 'Drop health check noise',
		description: 'filter out the /healthz requests',
		filter: filterOn('http.route', '/healthz'),
	},
	{
		name: 'Extract trace context',
		description: 'read trace_id and span_id from the body',
		filter: filterOn('service.name', 'checkout'),
	},
	{
		name: 'Rename severity field',
		description: 'level becomes severity_text',
		filter: filterOn('service.name', 'payments'),
	},
	{
		name: 'Flatten JSON payloads',
		description: 'expand nested attributes into their own keys',
		filter: filterOn('deployment.environment', 'production'),
	},
];

export const PIPELINE_MAX = PIPELINES.length;

export const VERSION_MAX = 6;

export interface PipelinesOptions {
	pipelines: number;
	processors: number;
	deployStatus: DeployStatus;
	versions: number;
}

const historyFor = (
	versions: number,
	deployStatus: DeployStatus,
): HistoryData[] =>
	Array.from({ length: versions }, (_unused, index) => {
		const version = versions - index;
		const isLatest = index === 0;
		const status = isLatest ? deployStatus : 'DEPLOYED';

		return {
			active: isLatest,
			createdAt: `2026-07-${String(10 + version).padStart(2, '0')}T13:48:31.032106578Z`,
			createdBy: isLatest ? 'ada@signoz.io' : 'grace@signoz.io',
			createdByName: isLatest ? 'Ada Lovelace' : 'Grace Hopper',
			deployStatus: status,
			deployResult: DEPLOY_RESULTS[status],
			disabled: false,
			elementType: 'log_pipelines',
			id: `storybook-pipelines-v${version}`,
			isValid: true,
			lastConf: '',
			lastHash: '',
			version,
		};
	});

/**
 * A latest version still deploying makes the page poll every three seconds,
 * which is the app's own behaviour and what the `Deploy status` control shows.
 */
export const logsPipelinesResponse = ({
	pipelines,
	processors,
	deployStatus,
	versions,
}: PipelinesOptions): { status: string; data: Pipeline } => ({
	status: 'success',
	data: {
		active: true,
		createdBy: 'ada@signoz.io',
		deployResult: DEPLOY_RESULTS[deployStatus],
		deployStatus,
		disabled: false,
		elementType: 'log_pipelines',
		id: 'storybook-pipelines',
		is_valid: true,
		lastConf: '',
		lastHash: '',
		version: versions,
		history: historyFor(versions, deployStatus),
		pipelines: PIPELINES.slice(0, pipelines).map(
			(pipeline, index): PipelineData => {
				const id = `storybook-pipeline-${index + 1}`;

				return {
					...pipeline,
					id,
					alias: pipeline.name.toLowerCase().replace(/\s+/g, '-'),
					createdAt: '2026-07-16T13:48:31.032106578Z',
					createdBy: 'ada@signoz.io',
					enabled: index !== 3,
					orderId: index + 1,
					config: processorsFor(id, processors),
				};
			},
		),
	},
});

/**
 * The simulation answers on the logs it was sent, so the preview can diff input
 * against output: the parsed fields land on the ones the pipeline writes to.
 */
export const pipelinePreviewResponse = (
	logs: ILog[],
): { status: string; data: { logs: ILog[] } } => ({
	status: 'success',
	data: {
		logs: logs.map((log) => ({
			...log,
			// `ILog` types every attribute map as `Record<string, never>`, so a value
			// only goes in through a cast.
			attributes_string: {
				...log.attributes_string,
				'http.method': 'POST',
				username: 'ada',
				level: String(log.severity_text ?? '').toLowerCase(),
			} as unknown as ILog['attributes_string'],
		})),
	},
});
