import './TraceDetailV2.styles.scss';

import { Typography } from 'antd';
import TraceWaterfall from 'container/TraceWaterfall/TraceWaterfall';

function TraceDetailsV2(): JSX.Element {
	return (
		<div className="trace-layout">
			<Typography.Text>Trace Details V2 Layout</Typography.Text>
			<div className="flame-graph">FlameGraph comes here!</div>
			<TraceWaterfall />
		</div>
	);
}

export default TraceDetailsV2;
