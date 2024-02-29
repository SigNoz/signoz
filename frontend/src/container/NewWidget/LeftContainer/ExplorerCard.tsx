/* eslint-disable react/jsx-props-no-spreading */
import './ExplorerCard.styles.scss';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { BaseAutocompleteDataWithId } from 'types/api/dashboard/getAll';
import { IField } from 'types/api/logs/fields';

function ExplorerCard({
	field,
	removeExplorerCard,
}: {
	field:
		| (IField & {
				id: string;
		  })
		| BaseAutocompleteDataWithId;
	removeExplorerCard: (name: string) => void;
}): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({ id: field.id });

	const style = {
		transition,
		transform: CSS.Transform.toString(transform),
	};

	const fieldName = 'name' in field ? field.name : field.key;

	return (
		<div
			ref={setNodeRef}
			{...attributes}
			{...listeners}
			style={style}
			className="explorer-card"
		>
			<div className="explorer-title">
				<GripVertical size={12} color="#5A5A5A" />
				{fieldName}
			</div>
			<Trash2
				size={12}
				color="red"
				onClick={(): void => removeExplorerCard(fieldName)}
			/>
		</div>
	);
}

export default ExplorerCard;
