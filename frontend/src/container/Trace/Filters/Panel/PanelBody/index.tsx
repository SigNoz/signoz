import React from 'react';
import { TraceFilterEnum, TraceReducer } from 'types/reducer/trace';
import { Card } from 'antd';

import Duration from './Duration';
import CommonCheckBox from './CommonCheckBox';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import Spinner from 'components/Spinner';

const PanelBody = (props: PanelBodyProps): JSX.Element => {
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

	return (
		<Card bordered={false}>
			{type === 'duration' ? <Duration /> : <CommonCheckBox name={type} />}
		</Card>
	);
};

interface PanelBodyProps {
	type: TraceFilterEnum;
}

export default PanelBody;
