import { convertMetricKeyToTrace } from 'lib/resourceAttributes';
import React from 'react';

import { QueryChipContainer, QueryChipItem } from './styles';
import { IMetricBuilderTagKeyQuery } from './types';

interface IQueryChipProps {
	queryData: IMetricBuilderTagKeyQuery;
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
			<QueryChipItem>{queryData.tagKey}</QueryChipItem>
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
