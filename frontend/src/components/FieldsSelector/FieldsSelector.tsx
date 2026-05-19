import { useCallback, useMemo, useState } from 'react';
import { toast } from '@signozhq/ui/sonner';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Check, TableColumnsSplit, X } from '@signozhq/icons';
import { FloatingPanel } from 'periscope/components/FloatingPanel';
import { TelemetryFieldKey } from 'types/api/v5/queryRange';
import { DataSource } from 'types/common/queryBuilder';

import AddedFields from './AddedFields';
import OtherFields from './OtherFields';

import styles from './FieldsSelector.module.scss';

const DEFAULT_PANEL_WIDTH = 350;
const DEFAULT_PANEL_HEIGHT_OFFSET = 100;
const DEFAULT_PANEL_RIGHT_INSET = 100;
const DEFAULT_PANEL_TOP_INSET = 50;

interface FieldsSelectorProps {
	isOpen: boolean;
	title: string;
	fields: TelemetryFieldKey[];
	onFieldsChange: (fields: TelemetryFieldKey[]) => void;
	onClose: () => void;
	signal: DataSource;
	maxFields?: number;
	width?: number;
	height?: number;
	defaultPosition?: { x: number; y: number };
}

function FieldsSelector({
	isOpen,
	title,
	fields,
	onFieldsChange,
	onClose,
	signal,
	maxFields,
	width = DEFAULT_PANEL_WIDTH,
	height,
	defaultPosition,
}: FieldsSelectorProps): JSX.Element | null {
	if (!isOpen) {
		return null;
	}

	const resolvedHeight =
		height ?? window.innerHeight - DEFAULT_PANEL_HEIGHT_OFFSET;
	const resolvedPosition = defaultPosition ?? {
		x: window.innerWidth - width - DEFAULT_PANEL_RIGHT_INSET,
		y: DEFAULT_PANEL_TOP_INSET,
	};
	const [draftFields, setDraftFields] = useState<TelemetryFieldKey[]>(fields);
	const [inputValue, setInputValue] = useState('');
	const [debouncedInputValue, setDebouncedInputValue] = useState('');

	const debouncedUpdate = useDebouncedFn((value) => {
		setDebouncedInputValue(value as string);
	}, 400);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>): void => {
			const value = e.target.value.trim().toLowerCase();
			setInputValue(value);
			debouncedUpdate(value);
		},
		[debouncedUpdate],
	);

	const handleAdd = useCallback(
		(field: TelemetryFieldKey): void => {
			if (maxFields !== undefined && draftFields.length >= maxFields) {
				return;
			}
			if (draftFields.some((f) => f.name === field.name)) {
				return;
			}
			setDraftFields((prev) => [...prev, field]);
		},
		[draftFields, maxFields],
	);

	const handleSave = useCallback((): void => {
		onFieldsChange(draftFields);
		toast.success('Saved successfully', {
			position: 'top-right',
		});
		onClose();
	}, [draftFields, onFieldsChange, onClose]);

	const handleDiscard = useCallback((): void => {
		setDraftFields(fields);
	}, [fields]);

	const hasUnsavedChanges = useMemo(
		() =>
			!(
				draftFields.length === fields.length &&
				draftFields.every((f, i) => f.name === fields[i]?.name)
			),
		[draftFields, fields],
	);

	const isAtLimit = maxFields !== undefined && draftFields.length >= maxFields;

	return (
		<FloatingPanel
			isOpen
			width={width}
			height={resolvedHeight}
			defaultPosition={resolvedPosition}
			enableResizing={false}
		>
			<div className={styles.root}>
				<div className={styles.header}>
					<div className={styles.title}>
						<TableColumnsSplit size={16} />
						{title}
					</div>
					<X className={styles.closeIcon} size={16} onClick={onClose} />
				</div>

				<section>
					<Input
						className={styles.searchInput}
						type="text"
						value={inputValue}
						placeholder="Search for a field..."
						onChange={handleInputChange}
					/>
				</section>

				<AddedFields
					inputValue={inputValue}
					fields={draftFields}
					onFieldsChange={setDraftFields}
					maxFields={maxFields}
				/>

				<OtherFields
					signal={signal}
					debouncedInputValue={debouncedInputValue}
					addedFields={draftFields}
					onAdd={handleAdd}
					isAtLimit={isAtLimit}
				/>

				{hasUnsavedChanges && (
					<div className={styles.footer}>
						<Button
							variant="outlined"
							color="secondary"
							onClick={handleDiscard}
							prefix={<X width={14} height={14} />}
						>
							Discard
						</Button>
						<Button
							variant="solid"
							color="primary"
							onClick={handleSave}
							prefix={<Check width={14} height={14} />}
						>
							Save changes
						</Button>
					</div>
				)}
			</div>
		</FloatingPanel>
	);
}

export default FieldsSelector;
