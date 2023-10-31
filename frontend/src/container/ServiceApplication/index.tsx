import ErrorBoundary from 'components/ErrorBoundry/ErrorBoundry';
import { FeatureKeys } from 'constants/features';
import useFeatureFlag from 'hooks/useFeatureFlag';

import ServiceMetrics from './ServiceMetrics';
import ServiceTraces from './ServiceTraces';
import { Container } from './styles';

function Services(): JSX.Element {
	const isSpanMetricEnabled = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	return (
		<ErrorBoundary>
			<Container>
				{isSpanMetricEnabled ? <ServiceMetrics /> : <ServiceTraces />}
			</Container>
		</ErrorBoundary>
	);
}

export default Services;
