import { Space } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import ReleaseNote from 'components/ReleaseNote';
import Spinner from 'components/Spinner';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import MetricTable from 'container/MetricsTable';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import { useNotifications } from 'hooks/useNotifications';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import React, { useEffect, useMemo } from 'react';
import { connect, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { GetService, GetServiceProps } from 'store/actions/metrics';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { GlobalReducer } from 'types/reducer/globalTime';
import MetricReducer from 'types/reducer/metrics';
import { Tags } from 'types/reducer/trace';

function Metrics({ getService }: MetricsProps): JSX.Element {
	const { minTime, maxTime, loading, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const location = useLocation();
	const { services, error, errorMessage } = useSelector<AppState, MetricReducer>(
		(state) => state.metrics,
	);
	const { notifications } = useNotifications();

	useEffect(() => {
		if (error) {
			notifications.error({
				message: errorMessage,
			});
		}
	}, [error, errorMessage, notifications]);

	const { queries } = useResourceAttribute();

	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries, '') as Tags[]) || [],
		[queries],
	);

	const isSkipped = getLocalStorageKey(SKIP_ONBOARDING) === 'true';

	useEffect(() => {
		if (loading === false) {
			getService({
				maxTime,
				minTime,
				selectedTags,
			});
		}
	}, [getService, loading, maxTime, minTime, selectedTags]);

	useEffect(() => {
		let timeInterval: NodeJS.Timeout;

		if (loading === false && !isSkipped && services.length === 0) {
			timeInterval = setInterval(() => {
				getService({
					maxTime,
					minTime,
					selectedTags,
				});
			}, 50000);
		}

		return (): void => {
			clearInterval(timeInterval);
		};
	}, [
		getService,
		isSkipped,
		loading,
		maxTime,
		minTime,
		services,
		selectedTime,
		selectedTags,
	]);

	if (loading) {
		return <Spinner tip="Loading..." />;
	}

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />

			<ResourceAttributesFilter />
			<MetricTable />
		</Space>
	);
}

interface DispatchProps {
	getService: (
		props: GetServiceProps,
	) => (dispatch: Dispatch<AppActions>, getState: () => AppState) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	getService: bindActionCreators(GetService, dispatch),
});

type MetricsProps = DispatchProps;

export default connect(null, mapDispatchToProps)(Metrics);
