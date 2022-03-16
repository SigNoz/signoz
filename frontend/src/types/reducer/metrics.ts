import { QueryEndpointData } from 'types/api/metrics/getQueryEndpoint';
import { ServicesList } from 'types/api/metrics/getService';
import { ServiceOverview } from 'types/api/metrics/getServiceOverview';
import { TopEndPoints } from 'types/api/metrics/getTopEndPoints';

interface MetricReducer {
	services: ServicesList[];
	loading: boolean;
	metricsApplicationLoading: boolean;
	error: boolean;
	errorMessage: string;
	topEndPoints: TopEndPoints[];
	applicationRpsEndpoints: QueryEndpointData[];
	applicationErrorEndpoints: QueryEndpointData[];
	dbRpsEndpoints: QueryEndpointData[];
	dbAvgDurationEndpoints: QueryEndpointData[];
	externalCallEndpoint: QueryEndpointData[];
	externalErrorEndpoints: QueryEndpointData[];
	addressedExternalCallDurationResponse: QueryEndpointData[];
	addressedExternalCallRPSResponse: QueryEndpointData[];
	serviceOverview: ServiceOverview[];
}

export default MetricReducer;
