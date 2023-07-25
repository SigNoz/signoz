import { FeatureKeys } from 'constants/features';
import useFeatureFlag from 'hooks/useFeatureFlag';

import ServiceMetrics from './ServiceMetrics';
import ServiceTraces from './ServiceTraces';
import { Container } from './styles';

function Services(): JSX.Element {
	const isSpanMetricEnabled = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	return (
		<Container>
			{isSpanMetricEnabled ? <ServiceMetrics /> : <ServiceTraces />}
		</Container>
	);
}

export default Services;
