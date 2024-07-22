import localStorageGet from 'api/browser/localstorage/get';
import localStorageSet from 'api/browser/localstorage/set';
import logEvent from 'api/common/logEvent';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import useErrorNotification from 'hooks/useErrorNotification';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { isUndefined } from 'lodash-es';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

import SkipOnBoardingModal from '../SkipOnBoardModal';
import ServiceTraceTable from './ServiceTracesTable';

function ServiceTraces(): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const { data, error, isLoading, isError } = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags,
	});

	useErrorNotification(error);

	const services = data || [];

	const [skipOnboarding, setSkipOnboarding] = useState(
		localStorageGet(SKIP_ONBOARDING) === 'true',
	);

	const onContinueClick = (): void => {
		localStorageSet(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};

	const logEventCalledRef = useRef(false);
	useEffect(() => {
		if (!logEventCalledRef.current && !isUndefined(data)) {
			const selectedEnvironments = queries.find(
				(val) => val.tagKey === 'resource_deployment_environment',
			)?.tagValue;

			const rps = data.reduce((total, service) => total + service.callRate, 0);

			logEvent('APM: List page visited', {
				numberOfServices: data?.length,
				selectedEnvironments,
				resourceAttributeUsed: !!queries?.length,
				rps,
			});
			logEventCalledRef.current = true;
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [data]);

	if (
		services.length === 0 &&
		isLoading === false &&
		!skipOnboarding &&
		isError === true
	) {
		return <SkipOnBoardingModal onContinueClick={onContinueClick} />;
	}

	return <ServiceTraceTable services={services} loading={isLoading} />;
}

export default ServiceTraces;
