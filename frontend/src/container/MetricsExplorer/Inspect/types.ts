import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import { AlignedData } from 'uplot';

export type InspectProps = {
	metricName: string | null;
	metricUnit: string | undefined;
	metricType?: MetricType | undefined;
	isOpen: boolean;
	onClose: () => void;
};

export interface UseInspectMetricsReturnData {
	inspectMetricsTimeSeries: InspectMetricsSeries[];
	inspectMetricsStatusCode: number;
	isInspectMetricsLoading: boolean;
	isInspectMetricsError: boolean;
	formattedInspectMetricsTimeSeries: AlignedData;
}

export interface GraphViewProps {
	inspectMetricsTimeSeries: InspectMetricsSeries[];
	metricUnit: string | undefined;
	metricName: string | null;
	metricType?: MetricType | undefined;
	formattedInspectMetricsTimeSeries: AlignedData;
	resetInspection: () => void;
}
