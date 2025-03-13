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
	metadata: MetricDetails['metadata'] | undefined;
	refetchMetricDetails: () => void;
}

export interface AllAttributesProps {
	attributes: MetricDetailsAttribute[];
	metricName: string;
}

export interface TopAttributesProps {
	items: Array<{
		key: string;
		count: number;
		percentage: number;
	}>;
	title: string;
	loadMore?: () => void;
	hideLoadMore?: boolean;
}
