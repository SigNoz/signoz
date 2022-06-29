import React from 'react';

import { QueryChipContainer, QueryChipItem } from './styles';
import { ITagKeyValueQuery } from './types';

interface IQueryChipProps {
	queryData: ITagKeyValueQuery;
	onClose: (id: string) => void;
	disabled?: boolean;
}

export default function QueryChip({
	queryData,
	onClose,
	disabled,
}: IQueryChipProps): JSX.Element {
	return (
		<QueryChipContainer>
			<QueryChipItem>{queryData.key}</QueryChipItem>
			<QueryChipItem>{queryData.op}</QueryChipItem>
			<QueryChipItem
				closable={!disabled}
				onClose={(): void => {
					if (!disabled) onClose(queryData.id);
				}}
			>
				{queryData.value.join(', ')}
			</QueryChipItem>
		</QueryChipContainer>
	);
}
QueryChip.defaultProps = {
	disabled: false,
};
