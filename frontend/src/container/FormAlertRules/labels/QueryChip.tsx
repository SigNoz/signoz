import { X } from '@signozhq/icons';
import { QueryChipContainer, QueryChipItem } from './styles';
import { ILabelRecord } from './types';

interface QueryChipProps {
	queryData: ILabelRecord;
	onRemove: (id: string) => void;
}

export default function QueryChip({
	queryData,
	onRemove,
}: QueryChipProps): JSX.Element {
	const { key, value } = queryData;
	return (
		<QueryChipContainer>
			<QueryChipItem color="vanilla">
				{key}: {value}
				{key !== 'severity' && key !== 'description' && (
					<X
						size={12}
						style={{ cursor: 'pointer', marginInlineStart: 4 }}
						onClick={(): void => onRemove(key)}
					/>
				)}
			</QueryChipItem>
		</QueryChipContainer>
	);
}
