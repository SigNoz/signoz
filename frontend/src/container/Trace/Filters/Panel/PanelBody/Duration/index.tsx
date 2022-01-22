import React, { useState } from 'react';

import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { TraceReducer } from 'types/reducer/trace';
import Spinner from 'components/Spinner';
import DurationComponent from './Duration';

const Duration = (): JSX.Element => {
	const { filterLoading } = useSelector<AppState, TraceReducer>(
		(state) => state.traces,
	);

	if (filterLoading) {
		return <Spinner height="10vh" tip="Loading.." />;
	}

	return <DurationComponent />;
};

export default Duration;
