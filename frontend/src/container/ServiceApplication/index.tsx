import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

import ServiceTraces from './ServiceTraces';
import { Container } from './styles';

function Services(): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	// const { servicename } = useParams<IServiceName>();
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	return (
		<Container>
			<ServiceTraces
				maxTime={maxTime}
				minTime={minTime}
				selectedTags={selectedTags}
				selectedTime={selectedTime}
			/>
		</Container>
	);
}

export default Services;
