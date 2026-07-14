import {
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

export const METRIC_METADATA_KEYS = {
	description: 'Description',
	unit: 'Unit',
	type: 'Metric Type',
	temporality: 'Temporality',
	isMonotonic: 'Monotonic',
};

export const METRIC_METADATA_TEMPORALITY_OPTIONS: Array<{
	value: MetrictypesTemporalityDTO;
	label: string;
}> = [
	{
		value: MetrictypesTemporalityDTO.delta,
		label: 'Delta',
	},
	{
		value: MetrictypesTemporalityDTO.cumulative,
		label: 'Cumulative',
	},
];

export const METRIC_METADATA_TYPE_OPTIONS: Array<{
	value: MetrictypesTypeDTO;
	label: string;
}> = [
	{
		value: MetrictypesTypeDTO.sum,
		label: 'Sum',
	},
	{
		value: MetrictypesTypeDTO.gauge,
		label: 'Gauge',
	},
	{
		value: MetrictypesTypeDTO.histogram,
		label: 'Histogram',
	},
	{
		value: MetrictypesTypeDTO.summary,
		label: 'Summary',
	},
	{
		value: MetrictypesTypeDTO.exponentialhistogram,
		label: 'Exponential Histogram',
	},
];

export const METRIC_METADATA_UPDATE_ERROR_MESSAGE =
	'Failed to update metadata, please try again. If the issue persists, please contact support.';
