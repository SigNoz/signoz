import React from 'react';

import { QueryChipContainer, QueryChipItem } from './styles';
import { ILabelRecord } from './types';

export default function QueryChip({
	queryData,
	onRemove,
}: {
	queryData: ILabelRecord;
	onRemove: (id: string) => void;
}): JSX.Element {
	const { key, value } = queryData;
	return (
		<QueryChipContainer>
			<QueryChipItem
				closable={key !== 'severity' && key !== 'description'}
				onClose={(): void => onRemove(key)}
			>
				{key}: {value}
			</QueryChipItem>
		</QueryChipContainer>
	);
}
