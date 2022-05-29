import { notification } from 'antd';
import getLocalStorageKey from 'api/browser/localstorage/get';
import Spinner from 'components/Spinner';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import ResourceAttributesFilter from 'container/MetricsApplication/ResourceAttributesFilter';
import MetricTable from 'container/MetricsTable';
import { convertRawQueriesToTraceSelectedTags } from 'lib/resourceAttributes';
import React, { useEffect, useMemo } from 'react';
import { connect, useSelector } from 'react-redux';
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
	const {
		services,
		resourceAttributeQueries,
		error,
		errorMessage,
	} = useSelector<AppState, MetricReducer>((state) => state.metrics);

	useEffect(() => {
		if (error) {
			notification.error({
				message: errorMessage,
			});
		}
	}, [error, errorMessage]);

	const selectedTags = useMemo(
		() =>
			(convertRawQueriesToTraceSelectedTags(resourceAttributeQueries) as Tags[]) ||
			[],
		[resourceAttributeQueries],
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
		<>
			<ResourceAttributesFilter />
			<MetricTable />
		</>
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
