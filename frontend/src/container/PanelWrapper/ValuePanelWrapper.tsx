import { PanelWrapperProps } from './panelWrapper.types';

function ValuePanelWrapper({
	widget,
	queryResponse,
	name,
}: PanelWrapperProps): JSX.Element {
	const { yAxisUnit, thresholds } = widget;
	console.log({ widget, queryResponse, name, yAxisUnit, thresholds });
	return <div>ValuePanelWrapper</div>;
}

export default ValuePanelWrapper;
