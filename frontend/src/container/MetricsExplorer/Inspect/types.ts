import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';

export type InspectProps = {
	metricName: string | null;
	isOpen: boolean;
	onClose: () => void;
};

export interface UseInspectMetricsReturnData {
	inspectMetricsTimeSeries: InspectMetricsSeries[];
	inspectMetricsStatusCode: number;
	isInspectMetricsLoading: boolean;
	isInspectMetricsError: boolean;
}
