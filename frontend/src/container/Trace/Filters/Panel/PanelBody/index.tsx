/* eslint-disable no-nested-ternary */
import { Card } from 'antd';
import Spinner from 'components/Spinner';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';

import CommonCheckBox from './CommonCheckBox';
import Duration from './Duration';
import TraceID from './SearchTraceID';

function PanelBody(props: PanelBodyProps): JSX.Element {
	const { type } = props;

	const { filterLoading } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	if (filterLoading) {
		return (
			<Card bordered={false}>
				<Spinner height="10vh" tip="Loading.." />
			</Card>
		);
	}
	const renderBody = (type: TraceFilterEnum): JSX.Element => {
		switch (type) {
			case 'traceID':
				return <TraceID />;
			case 'duration':
				return <Duration />;
			default:
				return <CommonCheckBox name={type} />;
		}
	};
	return <Card bordered={false}>{renderBody(type)}</Card>;
}

interface PanelBodyProps {
	type: TraceFilterEnum;
}

export default PanelBody;
