import Spinner from 'components/Spinner';
import UsageExplorerContainer from 'container/UsageExplorer';
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
	const { selectedService, selectedInterval, selectedTime } = useSelector<
		AppState,
		UsageReducer
	>((state) => state.usage);
	const { loading, selectedTime: globalSelectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	useEffect(() => {
		if (loading === false) {
			getInitialUsageData({
				selectedService,
				selectedTime: selectedTime,
				step: selectedInterval.value,
				globalSelectedTime,
			});
		}
	}, [
		getInitialUsageData,
		selectedService,
		selectedTime,
		loading,
		globalSelectedTime,
		selectedInterval,
	]);

	if (loading) {
		return <Spinner height="80vh" tip="Loading..." />;
	}

	return <UsageExplorerContainer />;
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
