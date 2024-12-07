import * as Sentry from '@sentry/react';
import { FeatureKeys } from 'constants/features';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useAppContext } from 'providers/App/App';

import ServiceMetrics from './ServiceMetrics';
import ServiceTraces from './ServiceTraces';
import { Container } from './styles';

function Services(): JSX.Element {
	const { featureFlags } = useAppContext();
	const isSpanMetricEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.USE_SPAN_METRICS)
			?.active || false;

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Container style={{ marginTop: 0 }}>
				{isSpanMetricEnabled ? <ServiceMetrics /> : <ServiceTraces />}
			</Container>
		</Sentry.ErrorBoundary>
	);
}

export default Services;
