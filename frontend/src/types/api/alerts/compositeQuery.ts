import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import {
	BuilderClickHouseResource,
	BuilderPromQLResource,
	BuilderQueryDataResourse,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export interface ICompositeMetricQuery {
	builderQueries: BuilderQueryDataResourse;
	promQueries: BuilderPromQLResource;
	chQueries: BuilderClickHouseResource;
	queryType: EQueryType;
	panelType: GRAPH_TYPES;
}
