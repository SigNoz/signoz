import React, { useEffect, useState } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { Button } from 'antd';

import { FormItem } from './styles';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';

import ROUTES from '../../../constants/routes';

const refreshFunctionality = [
	ROUTES.TRACE,
	ROUTES.SERVICE_METRICS,
	ROUTES.APPLICATION,
];

const RefreshButton = ({
	onRefreshHandler,
	refreshButtonHidden,
}: RefreshButtonProps): JSX.Element => {
	const [refreshButtonLoading, setRefreshButtonLoading] = useState(true);
	const [timeoutId, setTimeoutId] = useState<number>(0);
	const { pathname } = useLocation();

	const tracesLoading = useSelector<AppState, boolean>(
		(state) => state.trace.loading,
	);
	const metricsLoading = useSelector<AppState, boolean>(
		(state) => state.metrics.loading,
	);
	const metricsApplicationLoading = useSelector<AppState, boolean>(
		(state) => state.metrics.metricsApplicationLoading,
	);

	useEffect(() => {
		const metricsPage = matchPath(pathname, {
			path: ROUTES.APPLICATION,
			strict: true,
			exact: true,
		});
		const metricsApplicationPage = matchPath(pathname, {
			path: ROUTES.SERVICE_METRICS,
			strict: true,
		});
		const tracesPage = matchPath(pathname, {
			path: ROUTES.TRACE,
			strict: true,
			exact: true,
		});
		let loading =
			(metricsPage && metricsLoading) ||
			(metricsApplicationPage && metricsApplicationLoading) ||
			(tracesPage && tracesLoading);
		setRefreshButtonLoading(!!loading);
	}, [pathname, tracesLoading, metricsLoading, metricsApplicationLoading]);

	const handleRefresh = () => {
		onRefreshHandler();
		if (!refreshFunctionality.includes(pathname)) {
			//dummy refresh feedback when refresh button doesnt change any loading state in redux
			clearTimeout(timeoutId);
			setRefreshButtonLoading(true);
			let timerId = window.setTimeout(() => setRefreshButtonLoading(false), 1000);
			setTimeoutId(timerId);
		}
	};

	return (
		<FormItem hidden={refreshButtonHidden}>
			<Button
				type="primary"
				onClick={handleRefresh}
				loading={refreshButtonLoading}
			>
				Refresh
			</Button>
		</FormItem>
	);
};

interface RefreshButtonProps {
	onRefreshHandler: () => void;
	refreshButtonHidden: boolean;
}

export default RefreshButton;
