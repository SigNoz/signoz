import type { TopOperationList } from 'container/MetricsApplication/TopOperationsTable';
import type { DBOverView } from 'types/api/metrics/getDBOverview';
import type { ExternalAverageDuration } from 'types/api/metrics/getExternalAverageDuration';
import type { ExternalError } from 'types/api/metrics/getExternalError';
import type { ExternalService } from 'types/api/metrics/getExternalService';
import type { ServicesList } from 'types/api/metrics/getService';
import type { ServiceOverview } from 'types/api/metrics/getServiceOverview';

interface MetricReducer {
	services: ServicesList[];
	loading: boolean;
	metricsApplicationLoading: boolean;
	error: boolean;
	errorMessage: string;
	dbOverView: DBOverView[];
	externalService: ExternalService[];
	topOperations: TopOperationList[];
	externalAverageDuration: ExternalAverageDuration[];
	externalError: ExternalError[];
	serviceOverview: ServiceOverview[];
	topLevelOperations: string[];
}

export default MetricReducer;
