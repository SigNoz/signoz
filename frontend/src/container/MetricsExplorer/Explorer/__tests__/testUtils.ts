import type { MetricsexplorertypesMetricMetadataDTO } from 'api/generated/services/sigNoz.schemas/metricsexplorertypesMetricMetadataDTO';
import { MetrictypesTemporalityDTO } from 'api/generated/services/sigNoz.schemas/metrictypesTemporalityDTO';
import { MetrictypesTypeDTO } from 'api/generated/services/sigNoz.schemas/metrictypesTypeDTO';

export const MOCK_METRIC_METADATA: MetricsexplorertypesMetricMetadataDTO = {
	type: MetrictypesTypeDTO.sum,
	description: 'metric1 description',
	unit: 'metric1 unit',
	temporality: MetrictypesTemporalityDTO.cumulative,
	isMonotonic: true,
};
