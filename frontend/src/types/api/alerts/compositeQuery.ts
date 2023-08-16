import { PANEL_TYPES } from 'constants/queryBuilder';
import {
	BuilderClickHouseResource,
	BuilderPromQLResource,
	BuilderQueryDataResourse,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

export interface ICompositeMetricQuery {
	builderQueries: BuilderQueryDataResourse;
	promQueries: BuilderPromQLResource;
	chQueries: BuilderClickHouseResource;
	queryType: EQueryType;
	panelType: PANEL_TYPES;
	unit: Query['unit'];
}
