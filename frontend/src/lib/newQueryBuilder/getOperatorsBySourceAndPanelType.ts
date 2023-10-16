import { mapOfOperators, PANEL_TYPES } from 'constants/queryBuilder';
import {
	DataSource,
	MetricAggregateOperator,
	StringOperators,
} from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

type GetQueryOperatorsParams = {
	dataSource: DataSource;
	panelType: PANEL_TYPES;
};

// Modify this function if need special conditions for filtering of the operators
export const getOperatorsBySourceAndPanelType = ({
	dataSource,
	panelType,
}: GetQueryOperatorsParams): SelectOption<string, string>[] => {
	let operatorsByDataSource = mapOfOperators[dataSource];

	if (panelType === PANEL_TYPES.LIST || panelType === PANEL_TYPES.TRACE) {
		operatorsByDataSource = operatorsByDataSource?.filter(
			(operator) => operator.value === StringOperators.NOOP,
		);
	}
	if (panelType === PANEL_TYPES.TABLE && dataSource === DataSource.METRICS) {
		operatorsByDataSource = operatorsByDataSource?.filter(
			(operator) =>
				operator.value !== MetricAggregateOperator.NOOP &&
				operator.value !== MetricAggregateOperator.RATE,
		);
	}
	if (
		dataSource !== DataSource.METRICS &&
		panelType !== PANEL_TYPES.LIST &&
		panelType !== PANEL_TYPES.TRACE
	) {
		operatorsByDataSource = operatorsByDataSource?.filter(
			(operator) => operator.value !== StringOperators.NOOP,
		);
	}

	return operatorsByDataSource;
};
