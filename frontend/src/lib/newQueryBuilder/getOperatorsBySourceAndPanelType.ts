import { mapOfOperators, PANEL_TYPES } from 'constants/queryBuilder';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { DataSource, StringOperators } from 'types/common/queryBuilder';

type GetQueryOperatorsParams = {
	dataSource: DataSource;
	panelType: GRAPH_TYPES;
};

// Modify this function if need special conditions for filtering of the operators
export const getOperatorsBySourceAndPanelType = ({
	dataSource,
	panelType,
}: GetQueryOperatorsParams): string[] => {
	let operatorsByDataSource = mapOfOperators[dataSource];

	if (dataSource !== DataSource.METRICS && panelType !== PANEL_TYPES.LIST) {
		operatorsByDataSource = operatorsByDataSource.filter(
			(operator) => operator !== StringOperators.NOOP,
		);
	}

	return operatorsByDataSource;
};
