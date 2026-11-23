import type { PANEL_TYPES } from 'constants/queryBuilderPanelTypes';
import type {
	BuilderClickHouseResource,
	BuilderPromQLResource,
	BuilderQueryDataResourse,
	Query,
} from 'types/api/queryBuilder/queryBuilderData';
import type { EQueryType } from 'types/common/dashboard';

import type { QueryEnvelope } from '../v5/queryRange';

export interface ICompositeMetricQuery {
	builderQueries?: BuilderQueryDataResourse;
	promQueries?: BuilderPromQLResource;
	chQueries?: BuilderClickHouseResource;
	queryType: EQueryType;
	panelType: PANEL_TYPES;
	unit: Query['unit'];
	queries?: QueryEnvelope[];
}
