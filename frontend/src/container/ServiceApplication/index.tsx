import * as Sentry from '@sentry/react';
import { FeatureKeys } from 'constants/features';
import useFeatureFlag from 'hooks/useFeatureFlag';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

import ServiceMetrics from './ServiceMetrics';
import ServiceTraces from './ServiceTraces';
import { Container } from './styles';

function Services(): JSX.Element {
	const isSpanMetricEnabled = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Container style={{ marginTop: 0 }}>
				{isSpanMetricEnabled ? <ServiceMetrics /> : <ServiceTraces />}
			</Container>
		</Sentry.ErrorBoundary>
	);
}

export default Services;
