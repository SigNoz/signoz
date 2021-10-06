import Spinner from 'components/Spinner';
import MetricsApplicationContainer from 'container/MetricsApplication';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

const MetricsApplication = (): JSX.Element => {
	const { loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	if (loading) {
		return <Spinner tip="Loading..." />;
	}

	return <MetricsApplicationContainer />;
};

export default MetricsApplication;
