import { Button } from '@signozhq/ui/button';
import { SelectSimple } from '@signozhq/ui/select';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from '@signozhq/icons';

import {
	FieldContext,
	FieldContextValue,
	MapperOperation,
	MapperOperationValue,
	SourceConfig,
} from 'container/LLMObservability/AttributeMapping/types';
import KeySearchInput from '../../../KeySearchInput/KeySearchInput';
import styles from './SourceAttributeRow.module.scss';

const CONTEXT_OPTIONS = [
	{ value: FieldContext.attribute, label: 'Attribute' },
	{ value: FieldContext.resource, label: 'Resource' },
];

const OPERATION_OPTIONS = [
	{ value: MapperOperation.move, label: 'Move' },
	{ value: MapperOperation.copy, label: 'Copy' },
];

interface SourceAttributeRowProps {
	id: string;
	index: number;
	value: SourceConfig;
	canRemove: boolean;
	onChange: (index: number, patch: Partial<SourceConfig>) => void;
	onRemove: (index: number) => void;
}
function SourceAttributeRow({
	id,
	index,
	value,
	canRemove,
	onChange,
	onRemove,
}: SourceAttributeRowProps): JSX.Element {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.6 : 1,
	};

	return (
		<div className={styles.source} ref={setNodeRef} style={style}>
			<div
				className={styles.sourceHandle}
				data-testid={`mapper-form-source-handle-${index}`}
				{...attributes}
				{...listeners}
			>
				<GripVertical size={14} />
			</div>
			<span className={styles.sourceIndex}>{index + 1}</span>
			<KeySearchInput
				className={styles.sourceInput}
				placeholder="Source attribute key"
				value={value.key}
				fieldContext={value.context}
				onChange={(key): void => onChange(index, { key })}
				testId={`mapper-form-source-${index}`}
			/>
			<SelectSimple
				className={styles.sourceSelect}
				items={CONTEXT_OPTIONS}
				value={value.context}
				withPortal={false}
				onChange={(next): void =>
					onChange(index, { context: next as FieldContextValue })
				}
				testId={`mapper-form-source-context-${index}`}
			/>
			<SelectSimple
				className={styles.sourceSelect}
				items={OPERATION_OPTIONS}
				value={value.operation}
				withPortal={false}
				onChange={(next): void =>
					onChange(index, { operation: next as MapperOperationValue })
				}
				testId={`mapper-form-source-operation-${index}`}
			/>
			<Button
				variant="ghost"
				color="secondary"
				size="icon"
				aria-label="Remove source"
				disabled={!canRemove}
				onClick={(): void => onRemove(index)}
				testId={`mapper-form-source-remove-${index}`}
			>
				<X size={14} />
			</Button>
		</div>
	);
}

export default SourceAttributeRow;
