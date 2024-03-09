import { PanelWrapperProps } from './panelWrapper.types';

function ListPanelWrapper({
	widget,
	queryResponse,
	name,
}: PanelWrapperProps): JSX.Element {
	const { selectedLogFields, selectedTracesFields } = widget;
	const dataSource = widget.query.builder?.queryData[0]?.dataSource;
	console.log({
		widget,
		queryResponse,
		name,
		selectedLogFields,
		selectedTracesFields,
		dataSource,
	});
	return <div>ListPanelWrapper</div>;
}

export default ListPanelWrapper;
