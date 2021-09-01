import getAll from 'api/dashboard/getAll';
import Spinner from 'components/Spinner';
import ListOfAllDashboard from 'container/ListOfDashboard';
import useFetch from 'hooks/useFetch';
import React from 'react';
import { PayloadProps } from 'types/api/dashboard/getAll';

const Dashboard = (): JSX.Element => {
	const { payload, loading } = useFetch<PayloadProps, undefined>(getAll);

	if (loading) {
		return <Spinner size="large" tip="Loading.." />;
	}

	return <ListOfAllDashboard listOfDashboards={payload} />;
};

export default Dashboard;
