import type { MetricsexplorertypesMetricMetadataDTO } from 'api/generated/services/sigNoz.schemas';
import {
	MetrictypesTemporalityDTO,
	MetrictypesTypeDTO,
} from 'api/generated/services/sigNoz.schemas';

export const MOCK_METRIC_METADATA: MetricsexplorertypesMetricMetadataDTO = {
	type: MetrictypesTypeDTO.sum,
	description: 'metric1 description',
	unit: 'metric1 unit',
	temporality: MetrictypesTemporalityDTO.cumulative,
	isMonotonic: true,
};
