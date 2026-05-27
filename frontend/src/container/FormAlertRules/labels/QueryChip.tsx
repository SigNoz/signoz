import { Badge } from '@signozhq/ui/badge';
import { QueryChipContainer } from './styles';
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
	const isClosable = key !== 'severity' && key !== 'description';
	return (
		<QueryChipContainer>
			<Badge
				color="vanilla"
				closable={isClosable}
				onClose={(e): void => {
					e.preventDefault();
					onRemove(key);
				}}
			>
				{key}: {value}
			</Badge>
		</QueryChipContainer>
	);
}
