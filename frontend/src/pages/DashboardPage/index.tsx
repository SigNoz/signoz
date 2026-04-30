import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Modal, Typography } from 'antd';
import { AxiosError } from 'axios';
import NotFound from 'components/NotFound';
import Spinner from 'components/Spinner';
import DashboardContainer from 'container/DashboardContainer';
import { useDashboardBootstrap } from 'hooks/dashboard/useDashboardBootstrap';
import { useDashboardStore } from 'providers/Dashboard/store/useDashboardStore';
import { ErrorType } from 'types/common';

function DashboardPage(): JSX.Element {
	const { dashboardId } = useParams<{ dashboardId: string }>();

	const [onModal, Content] = Modal.useModal();

	const { isLoading, isError, isFetching, error } = useDashboardBootstrap(
		dashboardId,
		{ confirm: onModal.confirm },
	);

	const dashboardTitle = useDashboardStore((s) => s.dashboardData?.data.title);

	useEffect(() => {
		document.title = dashboardTitle || document.title;
	}, [dashboardTitle]);

	const errorMessage = isError
		? (error as AxiosError<{ errorType: string }>)?.response?.data?.errorType
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

	return (
		<>
			{Content}
			<DashboardContainer />
		</>
	);
}

export default DashboardPage;
