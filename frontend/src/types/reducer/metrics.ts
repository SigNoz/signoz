import { TopOperationList } from 'container/MetricsApplication/TopOperationsTable';
import { DBOverView } from 'types/api/metrics/getDBOverview';
import { ExternalAverageDuration } from 'types/api/metrics/getExternalAverageDuration';
import { ExternalError } from 'types/api/metrics/getExternalError';
import { ExternalService } from 'types/api/metrics/getExternalService';
import { ServicesList } from 'types/api/metrics/getService';
import { ServiceOverview } from 'types/api/metrics/getServiceOverview';

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
