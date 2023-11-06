import Graph from 'container/GridCardLayout/GridCard';
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
}: TopLevelOperationProps): JSX.Element {
	return (
		<Card>
			<GraphContainer>
				<Graph
					headerMenuList={MENU_ITEMS}
					name={name}
					widget={widget}
					onClickHandler={handleGraphClick(opName)}
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
}

export default TopLevelOperation;
