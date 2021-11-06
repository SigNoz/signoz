import { Typography } from 'antd';
import Spinner from 'components/Spinner';
import TraceCustomVisualisation from 'container/TraceCustomVisualization';
import TraceFilter from 'container/TraceFilter';
import TraceList from 'container/TraceList';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	GetInitialTraceData,
	ResetRaceData,
	GetInitialTraceDataProps,
} from 'store/actions/trace';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

const TraceDetail = ({
	getInitialTraceData,
	resetTraceData,
}: TraceDetailProps): JSX.Element => {
	const { loading, selectedTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { loading: TraceLoading, error, errorMessage } = useSelector<
		AppState,
		TraceReducer
	>((state) => state.trace);

	useEffect(() => {
		if (!loading) {
			getInitialTraceData({
				selectedTime,
			});
		}

		return (): void => {
			resetTraceData();
		};
	}, [getInitialTraceData, loading, selectedTime]);

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (loading || TraceLoading) {
		return <Spinner tip="Loading..." />;
	}

	return (
		<>
			<TraceFilter />
			<TraceCustomVisualisation />
			<TraceList />
		</>
	);
};

interface DispatchProps {
	getInitialTraceData: (props: GetInitialTraceDataProps) => void;
	resetTraceData: () => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getInitialTraceData: bindActionCreators(GetInitialTraceData, dispatch),
	resetTraceData: bindActionCreators(ResetRaceData, dispatch),
});

type TraceDetailProps = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceDetail);
