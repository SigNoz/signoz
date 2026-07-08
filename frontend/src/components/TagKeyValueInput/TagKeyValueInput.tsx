import { type ChangeEvent, type KeyboardEvent, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import TagBadge from '../TagBadge/TagBadge';
import { parseKeyValueTag } from './utils';

import styles from './TagKeyValueInput.module.scss';

interface TagKeyValueInputProps {
	// Tags as `key:value` strings.
	tags: string[];
	onTagsChange: (tags: string[]) => void;
	placeholder?: string;
	// Override the outer container styling per host (e.g. the create modal).
	className?: string;
	testId?: string;
}

// Strict key:value tag editor. A tag is committed only on Enter and only when
// it parses to a valid `key:value` pair — bare values are rejected with an
// inline error. Existing chips can be edited inline (double-click), and removed.
function TagKeyValueInput({
	tags,
	onTagsChange,
	placeholder = 'key:value',
	className,
	testId = 'tag-key-value-input',
}: TagKeyValueInputProps): JSX.Element {
	const [inputValue, setInputValue] = useState('');
	const [error, setError] = useState('');
	const [editIndex, setEditIndex] = useState(-1);
	const [editValue, setEditValue] = useState('');

	const removeTag = (tag: string): void => {
		onTagsChange(tags.filter((t) => t !== tag));
	};

	const commit = (): void => {
		const raw = inputValue.trim();
		if (!raw) {
			return;
		}
		const normalized = parseKeyValueTag(raw);
		if (!normalized) {
			setError('Tags must be in key:value format (both sides required).');
			return;
		}
		if (tags.includes(normalized)) {
			setError('This tag already exists.');
			return;
		}
		onTagsChange([...tags, normalized]);
		setInputValue('');
		setError('');
	};

	const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
		setInputValue(e.target.value);
		if (error) {
			setError('');
		}
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			e.preventDefault();
			commit();
		}
	};

	const startEdit = (index: number): void => {
		setEditIndex(index);
		setEditValue(tags[index]);
		setError('');
	};

	const cancelEdit = (): void => {
		setEditIndex(-1);
		setEditValue('');
	};

	const commitEdit = (): void => {
		const normalized = parseKeyValueTag(editValue);
		// Drop into a no-op (revert) on invalid or duplicate edits rather than
		// stranding the user in an un-exitable edit box.
		if (normalized && !tags.some((t, i) => t === normalized && i !== editIndex)) {
			onTagsChange(tags.map((t, i) => (i === editIndex ? normalized : t)));
		}
		cancelEdit();
	};

	const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitEdit();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancelEdit();
		}
	};

	return (
		<div className={cx(styles.container, className)}>
			<div className={styles.field}>
				{tags.map((tag, index) =>
					index === editIndex ? (
						<Input
							key={tag}
							className={styles.editInput}
							value={editValue}
							autoFocus
							testId={`${testId}-edit`}
							onChange={(e: ChangeEvent<HTMLInputElement>): void =>
								setEditValue(e.target.value)
							}
							onKeyDown={handleEditKeyDown}
							onBlur={commitEdit}
						/>
					) : (
						<TagBadge
							key={tag}
							className={styles.tag}
							closable
							onClose={(): void => removeTag(tag)}
						>
							<Button
								variant="ghost"
								color="secondary"
								className={styles.tagLabel}
								title="Double-click to edit"
								testId={`${testId}-chip`}
								onDoubleClick={(): void => startEdit(index)}
							>
								{tag}
							</Button>
						</TagBadge>
					),
				)}
				<Input
					className={styles.input}
					value={inputValue}
					placeholder={placeholder}
					testId={testId}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
				/>
			</div>
			{error && (
				<Typography className={styles.error} data-testid={`${testId}-error`}>
					{error}
				</Typography>
			)}
		</div>
	);
}

export default TagKeyValueInput;
