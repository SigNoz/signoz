import localStorageGet from 'api/browser/localstorage/get';
import localStorageSet from 'api/browser/localstorage/set';
import Spinner from 'components/Spinner';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import useGetTopLevelOperations from 'hooks/useGetTopLevelOperations';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useMemo, useState } from 'react';
import { QueryKey } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

import SkipOnBoardingModal from '../SkipOnBoardModal';
import ServiceMetricsApplication from './ServiceMetricsApplication';

function ServicesUsingMetrics(): JSX.Element {
	const { maxTime, minTime, selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const queryKey: QueryKey = [
		minTime,
		maxTime,
		selectedTags,
		globalSelectedInterval,
	];
	const { data, isLoading, isError } = useGetTopLevelOperations(queryKey, {
		start: minTime,
		end: maxTime,
	});

	const [skipOnboarding, setSkipOnboarding] = useState(
		localStorageGet(SKIP_ONBOARDING) === 'true',
	);

	const onContinueClick = (): void => {
		localStorageSet(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};

	const topLevelOperations = Object.entries(data || {});

	if (isLoading === false && !skipOnboarding && isError === true) {
		return <SkipOnBoardingModal onContinueClick={onContinueClick} />;
	}

	if (isLoading) {
		return <Spinner tip="Loading..." />;
	}

	return <ServiceMetricsApplication topLevelOperations={topLevelOperations} />;
}

export default ServicesUsingMetrics;
