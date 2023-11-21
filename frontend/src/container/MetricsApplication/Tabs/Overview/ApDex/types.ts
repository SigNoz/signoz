import { OnClickPluginOpts } from 'lib/uPlotLib/plugins/onClickPlugin';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

export interface ApDexApplicationProps {
	handleGraphClick: (type: string) => OnClickPluginOpts['onClick'];
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
