import { convertMetricKeyToTrace } from 'hooks/useResourceAttribute/utils';

import { QueryChipContainer, QueryChipItem } from '../../styles';
import { IQueryChipProps } from './types';

function QueryChip({ queryData, onClose }: IQueryChipProps): JSX.Element {
	const onCloseHandler = (): void => {
		onClose(queryData.id);
	};

	return (
		<QueryChipContainer>
			<QueryChipItem>{convertMetricKeyToTrace(queryData.tagKey)}</QueryChipItem>
			<QueryChipItem>{queryData.operator}</QueryChipItem>
			<QueryChipItem
				closable={queryData.tagKey !== 'resource_deployment_environment'}
				onClose={onCloseHandler}
			>
				{queryData.tagValue.join(', ')}
			</QueryChipItem>
		</QueryChipContainer>
	);
}

export default QueryChip;
