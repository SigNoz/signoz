import { FeatureKeys } from 'constants/features';
import useFeatureFlag from 'hooks/useFeatureFlag';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { ErrorBoundary } from 'react-error-boundary';
import { reportErrorStackTrace } from 'utils/loggingUtils';

import ServiceMetrics from './ServiceMetrics';
import ServiceTraces from './ServiceTraces';
import { Container } from './styles';

function Services(): JSX.Element {
	const isSpanMetricEnabled = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	return (
		<ErrorBoundary
			FallbackComponent={ErrorBoundaryFallback}
			onError={reportErrorStackTrace}
		>
			<Container style={{ marginTop: 0 }}>
				{isSpanMetricEnabled ? <ServiceMetrics /> : <ServiceTraces />}
			</Container>
		</ErrorBoundary>
	);
}

export default Services;
