import { Space } from 'antd';
import localStorageGet from 'api/browser/localstorage/get';
import localStorageSet from 'api/browser/localstorage/set';
import ReleaseNote from 'components/ReleaseNote';
import { SKIP_ONBOARDING } from 'constants/onboarding';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import ServicesTable from 'container/ServiceTable';
import SkipOnBoardingModal from 'container/ServiceTable/SkipOnBoardModal';
import useErrorNotification from 'hooks/useErrorNotification';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

function Metrics(): JSX.Element {
	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const location = useLocation();
	const { queries } = useResourceAttribute();
	const [skipOnboarding, setSkipOnboarding] = useState(
		localStorageGet(SKIP_ONBOARDING) === 'true',
	);

	const onContinueClick = (): void => {
		localStorageSet(SKIP_ONBOARDING, 'true');
		setSkipOnboarding(true);
	};

	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries, '') as Tags[]) || [],
		[queries],
	);

	const { data, error, isLoading, isError } = useQueryService({
		minTime,
		maxTime,
		selectedTime,
		selectedTags,
	});

	useErrorNotification(error);

	if (
		data?.length === 0 &&
		isLoading === false &&
		!skipOnboarding &&
		isError === true
	) {
		return <SkipOnBoardingModal onContinueClick={onContinueClick} />;
	}

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />

			<ResourceAttributesFilter />
			<ServicesTable services={data || []} isLoading={isLoading} />
		</Space>
	);
}

export default Metrics;
