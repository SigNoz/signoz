import { useCallback, useMemo, useState } from 'react';
import { toast } from '@signozhq/ui';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import { Check, TableColumnsSplit, X } from '@signozhq/icons';
import { BaseAutocompleteData } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { DataSource } from 'types/common/queryBuilder';

import AddedFields from './AddedFields';
import OtherFields from './OtherFields';

import './FieldsSettings.styles.scss';

const MAX_FIELDS_DEFAULT = 10;

interface FieldsSettingsProps {
	title: string;
	// Picker's native shape (`BaseAutocompleteData`) is preserved end-to-end so
	// downstream consumers (flamegraph `selectFields`, hover popovers) get full
	// field metadata without a lossy conversion at add-time.
	fields: BaseAutocompleteData[];
	onFieldsChange: (fields: BaseAutocompleteData[]) => void;
	onClose: () => void;
	dataSource: DataSource;
	maxFields?: number;
}

function FieldsSettings({
	title,
	fields,
	onFieldsChange,
	onClose,
	dataSource,
	maxFields = MAX_FIELDS_DEFAULT,
}: FieldsSettingsProps): JSX.Element {
	// Local draft state — changes here don't persist until Save
	const [draftFields, setDraftFields] = useState<BaseAutocompleteData[]>(fields);
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
		(field: BaseAutocompleteData): void => {
			if (draftFields.length >= maxFields) {
				return;
			}
			if (draftFields.some((f) => f.key === field.key)) {
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
				draftFields.every((f, i) => f.key === fields[i]?.key)
			),
		[draftFields, fields],
	);

	const isAtLimit = draftFields.length >= maxFields;

	return (
		<div className="fields-settings">
			<div className="fs-header">
				<div className="fs-title">
					<TableColumnsSplit size={16} />
					{title}
				</div>
				<X className="fs-close-icon" size={16} onClick={onClose} />
			</div>

			<section className="fs-search">
				<Input
					className="fs-search-input"
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
			/>

			<OtherFields
				dataSource={dataSource}
				debouncedInputValue={debouncedInputValue}
				addedFields={draftFields}
				onAdd={handleAdd}
				isAtLimit={isAtLimit}
			/>

			{hasUnsavedChanges && (
				<div className="fs-footer">
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
	);
}

export default FieldsSettings;
