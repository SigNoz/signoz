import { PANEL_TYPES } from 'constants/queryBuilder';
import { Container } from 'container/NewWidget/LeftContainer/WidgetGraph/styles';

function WidgetListView({
	selectedGraph,
}: {
	selectedGraph: PANEL_TYPES;
}): JSX.Element {
	return <Container $panelType={selectedGraph}>Hello</Container>;
}

export default WidgetListView;
