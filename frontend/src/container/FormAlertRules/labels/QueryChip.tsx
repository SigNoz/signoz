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
			<QueryChipItem
				closable={key !== 'severity' && key !== 'description'}
				onClose={(): void => onRemove(key)}
			>
				{key}: {value}
			</QueryChipItem>
		</QueryChipContainer>
	);
}
