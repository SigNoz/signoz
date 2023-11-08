import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { ClickHandlerType } from '../../Overview';

export interface ApDexApplicationProps {
	handleGraphClick: (type: string) => ClickHandlerType;
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
}

export interface ApDexDataSwitcherProps extends ApDexApplicationProps {
	thresholdValue?: number;
}

export interface ApDexMetricsProps extends ApDexDataSwitcherProps {
	delta?: boolean;
	metricsBuckets?: number[];
}
