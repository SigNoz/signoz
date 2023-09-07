import { QueryChipContainer, QueryChipItem } from './styles';
import { IQueryStructure } from './types';

export default function QueryChip({
	queryData,
	onRemove,
}: {
	queryData: IQueryStructure;
	onRemove: (id: string) => void;
}): JSX.Element {
	const { category, operator, value, id } = queryData;
	return (
		<QueryChipContainer>
			<QueryChipItem>{category}</QueryChipItem>
			<QueryChipItem>{operator}</QueryChipItem>
			<QueryChipItem closable onClose={(): void => onRemove(id)}>
				{Array.isArray(value) ? value.join(', ') : null}
			</QueryChipItem>
		</QueryChipContainer>
	);
}
