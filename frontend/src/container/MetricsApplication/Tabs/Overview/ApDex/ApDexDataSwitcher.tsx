import { FeatureKeys } from 'constants/features';
import useFeatureFlag from 'hooks/useFeatureFlag';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';

import { ClickHandlerType } from '../../Overview';
import ApDexMetricsApplication from './ApDexMetricsApplication';
import ApDexTraces from './ApDexTraces';

interface ApDexApplicationProps {
	handleGraphClick: (type: string) => ClickHandlerType;
	onDragSelect: (start: number, end: number) => void;
	topLevelOperationsRoute: string[];
	tagFilterItems: TagFilterItem[];
	thresholdValue: number;
}

function ApDexDataSwitcher({
	handleGraphClick,
	onDragSelect,
	topLevelOperationsRoute,
	tagFilterItems,
	thresholdValue,
}: ApDexApplicationProps): JSX.Element {
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
