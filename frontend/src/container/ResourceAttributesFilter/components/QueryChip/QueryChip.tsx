import {
	convertMetricKeyToTrace,
	getResourceDeploymentKeys,
} from 'hooks/useResourceAttribute/utils';

import { QueryChipContainer, QueryChipItem } from '../../styles';
import { IQueryChipProps } from './types';

function QueryChip({ queryData, onClose }: IQueryChipProps): JSX.Element {
	const onCloseHandler = (): void => {
		onClose(queryData.id);
	};

	const isClosable = queryData.tagKey !== getResourceDeploymentKeys();

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
