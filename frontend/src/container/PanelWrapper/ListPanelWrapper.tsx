import LogsPanelComponent from 'container/LogsPanelTable/LogsPanelComponent';
import TracesTableComponent from 'container/TracesTableComponent/TracesTableComponent';
import { DataSource } from 'types/common/queryBuilder';

import { PanelWrapperProps } from './panelWrapper.types';

function ListPanelWrapper({
	widget,
	queryResponse,
	setRequestData,
	onColumnWidthsChange,
}: PanelWrapperProps): JSX.Element {
	const dataSource = widget.query.builder?.queryData[0]?.dataSource;

	if (!setRequestData) {
		return <></>;
	}

	if (dataSource === DataSource.LOGS) {
		return (
			<LogsPanelComponent
				widget={widget}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
				onColumnWidthsChange={onColumnWidthsChange}
			/>
		);
	}
	return (
		<TracesTableComponent
			widget={widget}
			queryResponse={queryResponse}
			setRequestData={setRequestData}
			onColumnWidthsChange={onColumnWidthsChange}
		/>
	);
}

export default ListPanelWrapper;
