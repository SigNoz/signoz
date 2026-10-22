import { Dispatch, SetStateAction } from 'react';
import { MetricsexplorertypesMetricMetadataDTO } from 'api/generated/services/sigNoz.schemas';
import { Warning } from 'types/api';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

export interface TimeSeriesProps {
	onFetchingStateChange?: (isFetching: boolean) => void;
	showOneChartPerQuery: boolean;
	setWarning: Dispatch<SetStateAction<Warning | undefined>>;
	areAllMetricUnitsSame: boolean;
	isMetricUnitsLoading: boolean;
	isMetricUnitsError: boolean;
	metricUnits: (string | undefined)[];
	metricNames: string[];
	metrics: (MetricsexplorertypesMetricMetadataDTO | undefined)[];
	handleOpenMetricDetails: (metricName: string) => void;
	yAxisUnit: string | undefined;
	setYAxisUnit: (unit: string) => void;
	showYAxisUnitSelector: boolean;
	isCancelled?: boolean;
	exportDefaultQuery: Query;
}
