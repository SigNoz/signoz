import * as Sentry from '@sentry/react';
import { FeatureKeys } from 'constants/features';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useAppContext } from 'providers/App/App';

import ServiceMetrics from './ServiceMetrics';
import ServiceTraces from './ServiceTraces';

function Services({
	onUpdateChecklistDoneItem,
	isWelcomeChecklistSkipped,
}: {
	onUpdateChecklistDoneItem: (itemKey: string) => void;
	isWelcomeChecklistSkipped: boolean;
}): JSX.Element {
	const { featureFlags } = useAppContext();
	const isSpanMetricEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.USE_SPAN_METRICS)
			?.active || false;

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<div className="home-services-container">
				{isSpanMetricEnabled ? (
					<ServiceMetrics
						onUpdateChecklistDoneItem={onUpdateChecklistDoneItem}
						isWelcomeChecklistSkipped={isWelcomeChecklistSkipped}
					/>
				) : (
					<ServiceTraces
						onUpdateChecklistDoneItem={onUpdateChecklistDoneItem}
						isWelcomeChecklistSkipped={isWelcomeChecklistSkipped}
					/>
				)}
			</div>
		</Sentry.ErrorBoundary>
	);
}

export default Services;
