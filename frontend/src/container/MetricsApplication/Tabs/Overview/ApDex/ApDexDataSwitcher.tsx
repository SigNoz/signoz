import { FeatureKeys } from 'constants/features';
import useFeatureFlag from 'hooks/useFeatureFlag';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import ApDexMetricsApplication from './ApDexMetricsApplication';
import ApDexTraces from './ApDexTraces';

interface ApDexApplicationProps {
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
	thresholdValue: number;
}

function ApDexDataSwitcher({
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
	thresholdValue,
}: ApDexApplicationProps): JSX.Element {
	const isSpanMetricEnable = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	return isSpanMetricEnable ? (
		<ApDexMetricsApplication
			onDragSelect={onDragSelect}
			topLevelOperationsRoute={topLevelOperationsRoute}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	) : (
		<ApDexTraces
			onDragSelect={onDragSelect}
			topLevelOperationsRoute={topLevelOperationsRoute}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	);
}

export default ApDexDataSwitcher;
