import LogsPanelComponent from 'container/LogsPanelTable/LogsPanelComponent';
import TracesTableComponent from 'container/TracesTableComponent/TracesTableComponent';
import { DataSource } from 'types/common/queryBuilder';

import { PanelWrapperProps } from './panelWrapper.types';

function ListPanelWrapper({
	widget,
	queryResponse,
	setRequestData,
}: PanelWrapperProps): JSX.Element {
	const dataSource = widget.query.builder?.queryData[0]?.dataSource;

	if (!setRequestData) {
		// eslint-disable-next-line react/jsx-no-useless-fragment
		return <></>;
	}

	if (dataSource === DataSource.LOGS) {
		return (
			<LogsPanelComponent
				widget={widget}
				queryResponse={queryResponse}
				setRequestData={setRequestData}
			/>
		);
	}
	return (
		<TracesTableComponent
			widget={widget}
			queryResponse={queryResponse}
			setRequestData={setRequestData}
		/>
	);
}

export default ListPanelWrapper;
