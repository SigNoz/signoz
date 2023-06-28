import Graph from 'components/Graph';
import Spinner from 'components/Spinner';
import { useGetExplorerQueryRange } from 'hooks/queryBuilder/useGetExplorerQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { getExplorerChartData } from 'lib/explorer/getExplorerChartData';
import { memo, useMemo } from 'react';

import { CardStyled } from './LogsExplorerChart.styled';

function LogsExplorerChart(): JSX.Element {
	const { stagedQuery } = useQueryBuilder();
	const { data, isFetching } = useGetExplorerQueryRange(stagedQuery);

	const graphData = useMemo(() => {
		if (data?.payload.data && data.payload.data.result.length > 0) {
			return getExplorerChartData([data.payload.data.result[0]]);
		}

		return getExplorerChartData([]);
	}, [data]);

	return (
		<CardStyled>
			{isFetching ? (
				<Spinner size="default" height="100%" />
			) : (
				<Graph
					name="logsExplorerChart"
					data={graphData}
					type="bar"
					containerHeight="100%"
					animate
				/>
			)}
		</CardStyled>
	);
}

export default memo(LogsExplorerChart);
