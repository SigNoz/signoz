import {
	convertMetricKeyToTrace,
	getResourceDeploymentKeys,
} from 'hooks/useResourceAttribute/utils';

import { FeatureKeys } from '../../../../constants/features';
import { useAppContext } from '../../../../providers/App/App';
import { QueryChipContainer, QueryChipItem } from '../../styles';
import { IQueryChipProps } from './types';

function QueryChip({ queryData, onClose }: IQueryChipProps): JSX.Element {
	const onCloseHandler = (): void => {
		onClose(queryData.id);
	};

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const isClosable =
		queryData.tagKey !== getResourceDeploymentKeys(dotMetricsEnabled);

	return (
		<QueryChipContainer>
			<QueryChipItem color="vanilla">
				{convertMetricKeyToTrace(queryData.tagKey)}
			</QueryChipItem>
			<QueryChipItem color="vanilla">{queryData.operator}</QueryChipItem>
			<QueryChipItem
				color="vanilla"
				closable={isClosable}
				onClose={(e): void => {
					e.preventDefault();
					onCloseHandler();
				}}
			>
				{queryData.tagValue.join(', ')}
			</QueryChipItem>
		</QueryChipContainer>
	);
}

export default QueryChip;
