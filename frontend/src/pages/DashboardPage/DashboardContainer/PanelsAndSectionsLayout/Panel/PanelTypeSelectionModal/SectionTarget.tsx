import type { KeyboardEvent } from 'react';
import { Plus, X } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';

import SectionPicker from './SectionPicker';
import type { SectionOption } from './types';

import styles from './SectionTarget.module.scss';

interface SectionTargetProps {
	options: SectionOption[];
	value: string;
	onChange: (value: string) => void;
	/** Name of the section to create; null when targeting an existing one. */
	newSectionTitle: string | null;
	onNewSectionTitleChange: (title: string | null) => void;
	onSubmit: () => void;
}

function SectionTarget({
	options,
	value,
	onChange,
	newSectionTitle,
	onNewSectionTitleChange,
	onSubmit,
}: SectionTargetProps): JSX.Element {
	const startCreating = (): void => onNewSectionTitleChange('');

	if (newSectionTitle !== null) {
		const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
			if (e.key === 'Enter') {
				onSubmit();
			} else if (e.key === 'Escape') {
				// Drop the draft only, not the drawer.
				e.stopPropagation();
				onNewSectionTitleChange(null);
			}
		};

		return (
			<>
				in
				<Input
					autoFocus
					value={newSectionTitle}
					placeholder="New section name"
					className={styles.nameInput}
					onChange={(e): void => onNewSectionTitleChange(e.target.value)}
					onKeyDown={handleKeyDown}
					testId="panel-section-name"
				/>
				<Button
					variant="ghost"
					color="secondary"
					size="icon"
					aria-label="Cancel new section"
					onClick={(): void => onNewSectionTitleChange(null)}
					testId="panel-section-name-cancel"
				>
					<X size={14} />
				</Button>
			</>
		);
	}

	if (options.length > 1) {
		return (
			<>
				in
				<SectionPicker
					options={options}
					value={value}
					onChange={onChange}
					onCreate={startCreating}
				/>
			</>
		);
	}

	return (
		<Button
			variant="dashed"
			color="secondary"
			size="md"
			prefix={<Plus />}
			onClick={startCreating}
			testId="panel-section-create"
		>
			Add to new section
		</Button>
	);
}

export default SectionTarget;
