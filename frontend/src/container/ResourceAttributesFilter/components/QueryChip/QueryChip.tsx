import { X } from '@signozhq/icons';
import {
	convertMetricKeyToTrace,
	getResourceDeploymentKeys,
} from 'hooks/useResourceAttribute/utils';

import {
	QueryChipContainer,
	QueryChipItem,
	QueryChipRemoveButton,
} from '../../styles';
import { IQueryChipProps } from './types';

function QueryChip({ queryData, onClose }: IQueryChipProps): JSX.Element {
	const onCloseHandler = (): void => {
		onClose(queryData.id);
	};

	const isClosable = queryData.tagKey !== getResourceDeploymentKeys();

	return (
		<QueryChipContainer>
			<QueryChipItem>{convertMetricKeyToTrace(queryData.tagKey)}</QueryChipItem>
			<QueryChipItem>{queryData.operator}</QueryChipItem>
			<QueryChipItem
				suffix={
					isClosable ? (
						<QueryChipRemoveButton
							type="button"
							aria-label="Remove"
							onClick={(e): void => {
								e.preventDefault();
								onCloseHandler();
							}}
						>
							<X size={12} />
						</QueryChipRemoveButton>
					) : undefined
				}
			>
				{queryData.tagValue.join(', ')}
			</QueryChipItem>
		</QueryChipContainer>
	);
}

export default QueryChip;
