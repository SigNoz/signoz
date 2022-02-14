import { queryEndpointData } from 'types/api/metrics/getQueryEndpoint';
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
	applicationRpsEndpoints: queryEndpointData[];
	applicationErrorEndpoints: queryEndpointData[];
	dbRpsEndpoints: queryEndpointData[];
	dbAvgDurationEndpoints: queryEndpointData[];
	externalCallEndpoint: queryEndpointData[];
	externalErrorEndpoints: queryEndpointData[];
	addressedExternalCallDurationResponse: queryEndpointData[];
	addressedExternalCallRPSResponse: queryEndpointData[];
	serviceOverview: ServiceOverview[];
}

export default MetricReducer;
