import './PaginatedTraceFlamegraph.styles.scss';

import { Typography } from 'antd';
import useGetTraceFlamegraph from 'hooks/trace/useGetTraceFlamegraph';
import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';
import {
	FlamegraphSpan,
	TraceDetailFlamegraphURLProps,
} from 'types/api/trace/getTraceFlamegraph';

function TraceFlamegraph(): JSX.Element {
	const { id: traceId } = useParams<TraceDetailFlamegraphURLProps>();
	const { data, isFetching, error } = useGetTraceFlamegraph({
		level: 0,
		traceId,
	});
	console.log(data, isFetching, error);

	const renderSpanLevel = useCallback(
		(_: number, spans: FlamegraphSpan[]): JSX.Element => (
			<Typography.Text>{spans.length}</Typography.Text>
		),
		[],
	);
	return (
		<div className="trace-flamegraph">
			<Virtuoso
				height="40vh"
				data={data?.payload?.spans}
				itemContent={renderSpanLevel}
			/>
		</div>
	);
}

export default TraceFlamegraph;
