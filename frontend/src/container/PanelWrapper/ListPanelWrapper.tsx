// import LogsPanelComponent from 'container/LogsPanelTable/LogsPanelComponent';
import LogsPanelComponent from 'container/LogsPanelTable/LogsPanelComponent';
import { DataSource } from 'types/common/queryBuilder';

import { PanelWrapperProps } from './panelWrapper.types';

function ListPanelWrapper({
	widget,
	queryResponse,
	setRequestData,
}: PanelWrapperProps): JSX.Element {
	const { selectedLogFields, selectedTracesFields } = widget;
	const dataSource = widget.query.builder?.queryData[0]?.dataSource;
	console.log({
		widget,
		queryResponse,
		selectedLogFields,
		selectedTracesFields,
		dataSource,
		setRequestData,
	});

	if (dataSource === DataSource.LOGS && setRequestData) {
		return (
			<LogsPanelComponent
				widget={widget}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
			/>
		);
	}
	return <div>ListPanelWrapper</div>;
}

export default ListPanelWrapper;
