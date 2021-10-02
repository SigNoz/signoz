import Spinner from 'components/Spinner';
import React, { useEffect, useRef } from 'react';
import { connect, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	getInitialMerticData,
	getInitialMerticDataProps,
} from 'store/actions/MetricsActions';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';

const MetricsApplication = ({
	getInitialMerticData,
}: MetricsProps): JSX.Element => {
	const { loading, maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { servicename } = useParams<ServiceProps>();

	useEffect(() => {
		if (servicename !== undefined && loading === false) {
			getInitialMerticData({
				globalTime: {
					maxTime,
					minTime,
				},
				serviceName: servicename,
			});
		}
	}, [servicename, getInitialMerticData, maxTime, minTime, loading]);

	if (loading) {
		return <Spinner tip="Loading..." />;
	}

	return <div>asd</div>;
};

interface DispatchProps {
	getInitialMerticData: (
		props: getInitialMerticDataProps,
	) => (dispatch: Dispatch) => Promise<void>;
}

interface ServiceProps {
	servicename?: string;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getInitialMerticData: bindActionCreators(getInitialMerticData, dispatch),
});

type MetricsProps = DispatchProps;

export default connect(null, mapDispatchToProps)(MetricsApplication);
