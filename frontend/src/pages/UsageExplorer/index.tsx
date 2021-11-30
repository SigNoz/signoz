import Spinner from 'components/Spinner';
import MetricTable from 'container/MetricsTable';
import React, { useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	GetInitialUsageData,
	GetInitialUsageDataProps,
} from 'store/actions/usages/getInitialData';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import { UsageReducer } from 'types/reducer/usage';

const UsageExplorer = ({
	getInitialUsageData,
}: UsageExplorerProps): JSX.Element => {
	const { selectedService, step } = useSelector<AppState, UsageReducer>(
		(state) => state.usage,
	);
	const { selectedTime, loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	useEffect(() => {
		if (loading === false) {
			getInitialUsageData({
				selectedService,
				selectedTime,
				step,
			});
		}
	}, [getInitialUsageData, selectedService, selectedTime, step, loading]);

	if (loading) {
		return <Spinner tip="Loading..." />;
	}

	return <div>asd</div>;
};

interface DispatchProps {
	getInitialUsageData: (
		props: GetInitialUsageDataProps,
	) => (dispatch: Dispatch<AppActions>, getState: () => AppState) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getInitialUsageData: bindActionCreators(GetInitialUsageData, dispatch),
});

type UsageExplorerProps = DispatchProps;

export default connect(null, mapDispatchToProps)(UsageExplorer);
