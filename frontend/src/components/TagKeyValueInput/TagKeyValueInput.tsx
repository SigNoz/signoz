import { type ChangeEvent, type KeyboardEvent, useState } from 'react';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { Typography } from '@signozhq/ui/typography';
import cx from 'classnames';

import TagBadge from '../TagBadge/TagBadge';
import { validateTag } from './utils';

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
		const result = validateTag(raw, tags);
		if ('error' in result) {
			setError(result.error);
			return;
		}
		onTagsChange([...tags, result.tag]);
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
		// Plain Enter adds the tag; let Cmd/Ctrl+Enter pass through so a host form
		// (e.g. a modal) can submit on it.
		if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
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
		setError('');
	};

	const commitEdit = (revertOnInvalid = false): void => {
		const result = validateTag(editValue, tags, editIndex);
		if ('error' in result) {
			if (revertOnInvalid) {
				cancelEdit();
			} else {
				setError(result.error);
			}
			return;
		}
		onTagsChange(tags.map((t, i) => (i === editIndex ? result.tag : t)));
		cancelEdit();
	};

	const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
		// Plain Enter commits the edit; let Cmd/Ctrl+Enter pass through so a host
		// form (e.g. a modal) can submit on it.
		if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
			e.preventDefault();
			e.stopPropagation();
			commitEdit();
		} else if (e.key === 'Escape') {
			// Contain Escape so it cancels the inline edit instead of bubbling up and
			// closing the host drawer/modal.
			e.preventDefault();
			e.stopPropagation();
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
							onChange={(e: ChangeEvent<HTMLInputElement>): void => {
								setEditValue(e.target.value);
								if (error) {
									setError('');
								}
							}}
							onKeyDown={handleEditKeyDown}
							onBlur={(): void => commitEdit(true)}
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
