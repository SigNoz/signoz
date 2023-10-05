import { Typography } from 'antd';
import { AxiosError } from 'axios';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import NewDashboard from 'container/NewDashboard';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import { ErrorType } from 'types/common';

function NewDashboardPage(): JSX.Element {
	const { dashboardResponse } = useDashboard();

	const { isFetching, isError, isLoading } = dashboardResponse;

	const errorMessage = isError
		? (dashboardResponse?.error as AxiosError)?.response?.data.errorType
		: 'Something went wrong';

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

export default NewDashboardPage;
