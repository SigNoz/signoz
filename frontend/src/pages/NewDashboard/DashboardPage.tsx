import { Typography } from 'antd';
import { AxiosError } from 'axios';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import NewDashboard from 'container/NewDashboard';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { useEffect } from 'react';
import { ErrorType } from 'types/common';

function DashboardPage(): JSX.Element {
	const { dashboardResponse } = useDashboard();

	const { isFetching, isError, isLoading } = dashboardResponse;

	const errorMessage = isError
		? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
		  // @ts-ignore
		  (dashboardResponse?.error as AxiosError)?.response?.data?.errorType
		: 'Something went wrong';

	useEffect(() => {
		const dashboardTitle = dashboardResponse.data?.data.title;
		document.title = dashboardTitle || document.title;
	}, [dashboardResponse.data?.data.title, isFetching]);

	if (isError && !isFetching && errorMessage === ErrorType.NotFound) {
		return <NotFound />;
	}

	if (isError && errorMessage) {
		return <Typography>{errorMessage}</Typography>;
	}

	if (isLoading) {
		return <Spinner tip="Loading.." />;
	}

	return <NewDashboard />;
}

export default DashboardPage;
