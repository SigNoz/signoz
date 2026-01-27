import * as Sentry from '@sentry/react';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';

import ServiceTraces from './ServiceTraces';
import { Container } from './styles';

function Services(): JSX.Element {
	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Container style={{ marginTop: 0 }}>
				<ServiceTraces />
			</Container>
		</Sentry.ErrorBoundary>
	);
}

export default Services;
