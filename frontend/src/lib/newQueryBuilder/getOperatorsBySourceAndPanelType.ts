import { mapOfOperators, PANEL_TYPES } from 'constants/queryBuilder';
import { GRAPH_TYPES } from 'container/NewDashboard/ComponentsSlider';
import { DataSource, StringOperators } from 'types/common/queryBuilder';
import { SelectOption } from 'types/common/select';

type GetQueryOperatorsParams = {
	dataSource: DataSource;
	panelType: GRAPH_TYPES;
};

// Modify this function if need special conditions for filtering of the operators
export const getOperatorsBySourceAndPanelType = ({
	dataSource,
	panelType,
}: GetQueryOperatorsParams): SelectOption<string, string>[] => {
	let operatorsByDataSource = mapOfOperators[dataSource];

	if (dataSource !== DataSource.METRICS && panelType !== PANEL_TYPES.LIST) {
		operatorsByDataSource = operatorsByDataSource.filter(
			(operator) => operator.value !== StringOperators.NOOP,
		);
	}

	return operatorsByDataSource;
};
