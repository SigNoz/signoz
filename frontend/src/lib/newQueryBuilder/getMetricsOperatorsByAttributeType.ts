import {
	ATTRIBUTE_TYPES,
	metricsOperatorsByType,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import {
	metricsEmptyTimeAggregateOperatorOptions,
	metricsUnknownTimeAggregateOperatorOptions,
} from 'constants/queryBuilderOperators';
import { isEmpty } from 'lodash-es';
import { DataSource } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

type GetQueryOperatorsParams = {
	dataSource: DataSource;
	panelType: PANEL_TYPES;
	aggregateAttributeType: ATTRIBUTE_TYPES;
};

export const getMetricsOperatorsByAttributeType = ({
	dataSource,
	aggregateAttributeType,
}: GetQueryOperatorsParams): SelectOption<string, string>[] => {
	if (dataSource === DataSource.METRICS && aggregateAttributeType) {
		if (aggregateAttributeType === ATTRIBUTE_TYPES.SUM) {
			return metricsOperatorsByType.Sum;
		}

		if (aggregateAttributeType === ATTRIBUTE_TYPES.GAUGE) {
			return metricsOperatorsByType.Gauge;
		}
	}

	if (dataSource === DataSource.METRICS && isEmpty(aggregateAttributeType)) {
		return metricsUnknownTimeAggregateOperatorOptions;
	}

	return metricsEmptyTimeAggregateOperatorOptions;
};
