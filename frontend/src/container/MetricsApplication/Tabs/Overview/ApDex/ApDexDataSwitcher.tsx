import { FeatureKeys } from 'constants/features';
import useFeatureFlag from 'hooks/useFeatureFlag';

import ApDexMetricsApplication from './ApDexMetricsApplication';
import ApDexTraces from './ApDexTraces';
import { ApDexDataSwitcherProps } from './types';

function ApDexDataSwitcher({
	handleGraphClick,
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
	thresholdValue,
}: ApDexDataSwitcherProps): JSX.Element {
	const isSpanMetricEnable = useFeatureFlag(FeatureKeys.USE_SPAN_METRICS)
		?.active;

	return isSpanMetricEnable ? (
		<ApDexMetricsApplication
			handleGraphClick={handleGraphClick}
			onDragSelect={onDragSelect}
			topLevelOperationsRoute={topLevelOperationsRoute}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	) : (
		<ApDexTraces
			handleGraphClick={handleGraphClick}
			onDragSelect={onDragSelect}
			topLevelOperationsRoute={topLevelOperationsRoute}
			tagFilterItems={tagFilterItems}
			thresholdValue={thresholdValue}
		/>
	);
}

export default ApDexDataSwitcher;
