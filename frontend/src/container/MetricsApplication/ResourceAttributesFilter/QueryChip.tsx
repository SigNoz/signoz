import { convertMetricKeyToTrace } from 'lib/resourceAttributes';
import React from 'react';

import { QueryChipContainer, QueryChipItem } from './styles';
import { IResourceAttributeQuery } from './types';

interface IQueryChipProps {
	queryData: IResourceAttributeQuery;
	onClose: (id: string) => void;
	disabled: boolean;
}

export default function QueryChip({
	queryData,
	onClose,
	disabled,
}: IQueryChipProps): JSX.Element {
	return (
		<QueryChipContainer>
			<QueryChipItem>{convertMetricKeyToTrace(queryData.tagKey)}</QueryChipItem>
			<QueryChipItem>{queryData.operator}</QueryChipItem>
			<QueryChipItem
				closable={!disabled}
				onClose={(): void => {
					if (!disabled) onClose(queryData.id);
				}}
			>
				{queryData.tagValue.join(', ')}
			</QueryChipItem>
		</QueryChipContainer>
	);
}
