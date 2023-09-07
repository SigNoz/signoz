import Graph from 'container/GridGraphLayout/Graph/';
import { MENU_ITEMS } from 'container/MetricsApplication/constant';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import { Widgets } from 'types/api/dashboard/getAll';

import { ClickHandlerType } from '../Overview';

function TopLevelOperation({
	name,
	opName,
	onDragSelect,
	handleGraphClick,
	widget,
	yAxisUnit,
}: TopLevelOperationProps): JSX.Element {
	return (
		<Card>
			<GraphContainer>
				<Graph
					name={name}
					headerMenuList={MENU_ITEMS}
					widget={widget}
					onClickHandler={handleGraphClick(opName)}
					yAxisUnit={yAxisUnit}
					onDragSelect={onDragSelect}
				/>
			</GraphContainer>
		</Card>
	);
}

interface TopLevelOperationProps {
	name: string;
	opName: string;
	onDragSelect: (start: number, end: number) => void;
	handleGraphClick: (type: string) => ClickHandlerType;
	widget: Widgets;
	yAxisUnit: string;
}

export default TopLevelOperation;
