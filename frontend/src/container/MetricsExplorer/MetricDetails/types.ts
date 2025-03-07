import {
	MetricDetails,
	MetricDetailsAlert,
	MetricDetailsAttribute,
	MetricDetailsDashboard,
} from 'api/metricsExplorer/getMetricDetails';

export interface MetricDetailsProps {
	onClose: () => void;
	isOpen: boolean;
	metricName: string | null;
	isModalTimeSelection: boolean;
}

export interface DashboardsAndAlertsPopoverProps {
	dashboards: MetricDetailsDashboard[] | null;
	alerts: MetricDetailsAlert[] | null;
}

export interface MetadataProps {
	metricName: string;
	metadata: MetricDetails['metadata'];
	refetchMetricDetails: () => void;
}

export interface AllAttributesProps {
	attributes: MetricDetailsAttribute[];
	metricName: string;
}
