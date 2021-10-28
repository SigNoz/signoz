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
	GetSelectedDataProps,
	GetSelectedTraceData,
} from 'store/actions/trace';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { TraceReducer } from 'types/reducer/trace';

const TraceDetail = ({
	getInitialTraceData,
	getSelectedTraceData,
}: TraceDetailProps): JSX.Element => {
	const { loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const {
		loading: TraceLoading,
		error,
		errorMessage,
		selectedKind,
		selectedService,
		selectedOperation,
		selectedTags,
		selectedLatency,
	} = useSelector<AppState, TraceReducer>((state) => state.trace);

	useEffect(() => {
		if (!loading) {
			getInitialTraceData();
		}
	}, [getInitialTraceData, loading]);

	useEffect(() => {
		if (
			selectedKind.length !== 0 ||
			selectedService.length !== 0 ||
			selectedOperation.length !== 0 ||
			selectedTags.length !== 0 ||
			selectedLatency.max.length !== 0 ||
			selectedLatency.min.length !== 0
		) {
			getSelectedTraceData({
				selectedKind,
				selectedService,
				selectedOperation,
				selectedTags,
				selectedLatency,
			});
		}
	}, [
		selectedKind,
		selectedService,
		selectedOperation,
		selectedTags,
		selectedLatency,
		getSelectedTraceData,
	]);

	if (error) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (TraceLoading || loading) {
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
	getInitialTraceData: () => void;
	getSelectedTraceData: (props: GetSelectedDataProps) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getInitialTraceData: bindActionCreators(GetInitialTraceData, dispatch),
	getSelectedTraceData: bindActionCreators(GetSelectedTraceData, dispatch),
});

type TraceDetailProps = DispatchProps;

export default connect(null, mapDispatchToProps)(TraceDetail);
