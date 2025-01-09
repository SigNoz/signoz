import './PaginatedTraceFlamegraph.styles.scss';

import { Typography } from 'antd';
import useGetTraceFlamegraph from 'hooks/trace/useGetTraceFlamegraph';
import { useParams } from 'react-router-dom';
import { TraceDetailFlamegraphURLProps } from 'types/api/trace/getTraceFlamegraph';

function TraceFlamegraph(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailFlamegraphURLProps>();
	const { data, isFetching } = useGetTraceFlamegraph({
		level: 0,
		traceId,
	});
	console.log(data, isFetching);
	return (
		<Typography.Text className="trace-flamegraph">
			Trace Flamegraph
		</Typography.Text>
	);
}

export default TraceFlamegraph;
