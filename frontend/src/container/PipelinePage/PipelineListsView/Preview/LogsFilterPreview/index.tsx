import './styles.scss';

import {
	initialFilters,
	initialQueriesMap,
	PANEL_TYPES,
} from 'constants/queryBuilder';
import { useGetQueryRange } from 'hooks/queryBuilder/useGetQueryRange';
import _ from 'lodash-es';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';
import { LogsAggregatorOperator } from 'types/common/queryBuilder';
import { GlobalReducer } from 'types/reducer/globalTime';

function LogsFilterPreview({ filter }: LogsFilterPreviewProps): JSX.Element {
	const query = useMemo(() => {
		const q = _.cloneDeep(initialQueriesMap.logs);
		q.builder.queryData[0] = {
			...q.builder.queryData[0],
			filters: filter || initialFilters,
			aggregateOperator: LogsAggregatorOperator.NOOP,
			limit: 10,
		};
		return q;
	}, [filter]);

	console.log('preview filter prop', filter);

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
	>((state: { globalTime: any }) => state.globalTime);

	const queryResponse = useGetQueryRange({
		graphType: PANEL_TYPES.LIST,
		query,
		selectedTime: 'GLOBAL_TIME',
		globalSelectedInterval,
	});

	console.log(queryResponse);
	let content = <div>No logs found</div>;
	if (queryResponse?.isError) {
		content = <div>could not fetch logs for filter</div>;
	} else if (queryResponse?.isFetching) {
		content = <div>Loading...</div>;
	} else if ((filter?.items?.length || 0) < 1) {
		content = <div />;
	} else {
		const logsList =
			queryResponse?.data?.payload?.data?.newResult?.data?.result[0]?.list || [];
		if (logsList.length > 0) {
			content = (
				<>
					{logsList.map((l) => (
						<div key={l.data.id}>{l.data.body}</div>
					))}
				</>
			);
		}
	}

	return (
		<div className="logs-filter-preview-container">
			<div className="logs-filter-preview-header">Preview</div>
			<div className="logs-filter-preview-content">{content}</div>
		</div>
	);
}

interface LogsFilterPreviewProps {
	filter: TagFilter;
}

export default LogsFilterPreview;
