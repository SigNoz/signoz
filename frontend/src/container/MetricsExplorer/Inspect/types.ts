import { InspectMetricsSeries } from 'api/metricsExplorer/getInspectMetricsDetails';
import { MetricType } from 'api/metricsExplorer/getMetricsList';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { AlignedData } from 'uplot';

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
	formattedInspectMetricsTimeSeries: AlignedData;
	spaceAggregationLabels: string[];
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	inspectionStep: InspectionStep;
	isInspectMetricsRefetching: boolean;
	spaceAggregatedSeriesMap: Map<string, InspectMetricsSeries[]>;
	aggregatedTimeSeries: InspectMetricsSeries[];
	timeAggregatedSeriesMap: Map<number, GraphPopoverData[]>;
	reset: () => void;
}

export interface GraphViewProps {
	inspectMetricsTimeSeries: InspectMetricsSeries[];
	metricUnit: string | undefined;
	metricName: string | null;
	metricType?: MetricType | undefined;
	formattedInspectMetricsTimeSeries: AlignedData;
	resetInspection: () => void;
	spaceAggregationSeriesMap: Map<string, InspectMetricsSeries[]>;
	inspectionStep: InspectionStep;
	setPopoverOptions: (options: GraphPopoverOptions | null) => void;
	popoverOptions: GraphPopoverOptions | null;
	showExpandedView: boolean;
	setShowExpandedView: (showExpandedView: boolean) => void;
	setExpandedViewOptions: (options: GraphPopoverOptions | null) => void;
	metricInspectionOptions: MetricInspectionOptions;
	isInspectMetricsRefetching: boolean;
}

export interface QueryBuilderProps {
	metricName: string | null;
	setMetricName: (metricName: string) => void;
	metricType: MetricType | undefined;
	spaceAggregationLabels: string[];
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	inspectionStep: InspectionStep;
	inspectMetricsTimeSeries: InspectMetricsSeries[];
	searchQuery: IBuilderQuery;
}

export interface MetricNameSearchProps {
	metricName: string | null;
	setMetricName: (metricName: string) => void;
}

export interface MetricFiltersProps {
	searchQuery: IBuilderQuery;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	metricName: string | null;
	metricType: MetricType | null;
}

export interface MetricTimeAggregationProps {
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	inspectionStep: InspectionStep;
	inspectMetricsTimeSeries: InspectMetricsSeries[];
}

export interface MetricSpaceAggregationProps {
	spaceAggregationLabels: string[];
	metricInspectionOptions: MetricInspectionOptions;
	dispatchMetricInspectionOptions: (action: MetricInspectionAction) => void;
	inspectionStep: InspectionStep;
}

export enum TimeAggregationOptions {
	LATEST = 'latest',
	SUM = 'sum',
	AVG = 'avg',
	MIN = 'min',
	MAX = 'max',
	COUNT = 'count',
}

export enum SpaceAggregationOptions {
	SUM_BY = 'sum_by',
	MIN_BY = 'min_by',
	MAX_BY = 'max_by',
	AVG_BY = 'avg_by',
}

export interface MetricInspectionOptions {
	timeAggregationOption: TimeAggregationOptions | undefined;
	timeAggregationInterval: number | undefined;
	spaceAggregationOption: SpaceAggregationOptions | undefined;
	spaceAggregationLabels: string[];
	filters: TagFilter;
}

export type MetricInspectionAction =
	| { type: 'SET_TIME_AGGREGATION_OPTION'; payload: TimeAggregationOptions }
	| { type: 'SET_TIME_AGGREGATION_INTERVAL'; payload: number }
	| { type: 'SET_SPACE_AGGREGATION_OPTION'; payload: SpaceAggregationOptions }
	| { type: 'SET_SPACE_AGGREGATION_LABELS'; payload: string[] }
	| { type: 'SET_FILTERS'; payload: TagFilter }
	| { type: 'RESET_INSPECTION' };

export enum InspectionStep {
	TIME_AGGREGATION = 1,
	SPACE_AGGREGATION = 2,
	COMPLETED = 3,
}

export interface StepperProps {
	inspectionStep: InspectionStep;
	resetInspection: () => void;
}

export interface GraphPopoverOptions {
	x: number;
	y: number;
	value: number;
	timestamp: number;
	timeSeries: InspectMetricsSeries | undefined;
}

export interface GraphPopoverProps {
	spaceAggregationSeriesMap: Map<string, InspectMetricsSeries[]>;
	options: GraphPopoverOptions | null;
	popoverRef: React.RefObject<HTMLDivElement>;
	step: InspectionStep;
	openInExpandedView: () => void;
}

export interface GraphPopoverData {
	timestamp?: number;
	value: string;
	title?: string;
	type: 'instance' | 'aggregated';
	timeSeries?: InspectMetricsSeries;
}

export interface ExpandedViewProps {
	options: GraphPopoverOptions | null;
	spaceAggregationSeriesMap: Map<string, InspectMetricsSeries[]>;
	step: InspectionStep;
	metricInspectionOptions: MetricInspectionOptions;
	timeAggregatedSeriesMap: Map<number, GraphPopoverData[]>;
}

export interface TableViewProps {
	inspectionStep: InspectionStep;
	inspectMetricsTimeSeries: InspectMetricsSeries[];
	setShowExpandedView: (showExpandedView: boolean) => void;
	setExpandedViewOptions: (options: GraphPopoverOptions | null) => void;
	metricInspectionOptions: MetricInspectionOptions;
	isInspectMetricsRefetching: boolean;
}

export interface TableViewDataItem {
	title: JSX.Element;
	values: JSX.Element;
	key: number;
}
