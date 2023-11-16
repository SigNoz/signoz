import { FeatureKeys } from 'constants/features';
import useFeatureFlag from 'hooks/useFeatureFlag';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { ErrorBoundary } from 'react-error-boundary';

import ServiceMetrics from './ServiceMetrics';
import ServiceTraces from './ServiceTraces';
import { Container } from './styles';

function Services(): JSX.Element {
	const isSpanMetricEnabled = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	return (
		<ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
			<Container>
				{isSpanMetricEnabled ? <ServiceMetrics /> : <ServiceTraces />}
			</Container>
		</ErrorBoundary>
	);
}

export default Services;
