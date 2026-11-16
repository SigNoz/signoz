import { useEffect } from 'react';
import logEvent from 'api/common/logEvent';
import SystemDashboard from 'container/SystemDashboard/SystemDashboard';
import { createSystemDashboardHost } from 'container/SystemDashboard/systemDashboardHost';
import {
	CHARTS_ONLY,
	withControls,
} from 'pages/DashboardPage/DashboardContainer/controls/presets';

const KAFKA_METRICS = createSystemDashboardHost(
	'kafka-metrics',
	'kafka-metrics',
);

// The page's own time picker drives every view; charts keep V1's View action and zoom.
const KAFKA_METRICS_CONTROLS = withControls(CHARTS_ONLY, {
	toolbar: false,
	panelActions: { view: true },
});

/** Kafka broker, producer, consumer, JVM and partition metrics: the `kafka-metrics` system dashboard. */
function MetricPage(): JSX.Element {
	useEffect(() => {
		void logEvent('MQ Kafka: Metric view', {});
	}, []);

	return (
		<div data-testid="mq-metric-page">
			<SystemDashboard host={KAFKA_METRICS} controls={KAFKA_METRICS_CONTROLS} />
		</div>
	);
}

export default MetricPage;
