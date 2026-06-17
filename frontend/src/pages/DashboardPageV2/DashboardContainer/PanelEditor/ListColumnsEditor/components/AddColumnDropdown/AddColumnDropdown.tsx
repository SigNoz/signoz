import { useState } from 'react';
import { Input } from 'antd';
import { Popover, PopoverContent, PopoverTrigger } from '@signozhq/ui/popover';
import { Check, Plus, Search } from '@signozhq/icons';
import type {
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

import { useListColumnSuggestions } from '../../hooks/useListColumnSuggestions';
import styles from './AddColumnDropdown.module.scss';

interface AddColumnDropdownProps {
	signal: TelemetrytypesSignalDTO | undefined;
	/** Names already chosen — drives the checked state + toggle behavior. */
	selectedNames: Set<string>;
	onToggle: (field: TelemetrytypesTelemetryFieldKeyDTO) => void;
}

/**
 * The "+" affordance for the List columns editor: a popover with a field-key
 * search and a togglable suggestion list. Picking a suggestion adds it (with its
 * metadata); picking a selected one removes it. A non-matching search term can be
 * added verbatim so fields not yet indexed are still selectable.
 */
function AddColumnDropdown({
	signal,
	selectedNames,
	onToggle,
}: AddColumnDropdownProps): JSX.Element {
	const [open, setOpen] = useState(false);
	const { searchText, setSearchText, suggestions, isFetching } =
		useListColumnSuggestions(signal);

	const trimmed = searchText.trim();
	const hasExactMatch = suggestions.some((field) => field.name === trimmed);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={styles.addBtn}
					aria-label="Add column"
					data-testid="list-columns-add"
				>
					<Plus size={16} />
				</button>
			</PopoverTrigger>
			<PopoverContent arrow side="top" align="end" className={styles.dropdown}>
				<Input
					autoFocus
					className={styles.search}
					value={searchText}
					onChange={(event): void => setSearchText(event.target.value)}
					placeholder="Search fields"
					prefix={<Search size={14} />}
					data-testid="list-columns-search"
				/>
				<div className={styles.suggestionList}>
					{trimmed && !hasExactMatch && (
						<button
							type="button"
							className={styles.suggestion}
							onClick={(): void => onToggle({ name: trimmed })}
							data-testid="list-columns-add-custom"
						>
							<span className={styles.checkSlot} />
							Add &quot;{trimmed}&quot;
						</button>
					)}
					{suggestions.map((field) => {
						const checked = selectedNames.has(field.name);
						return (
							<button
								type="button"
								key={field.name}
								className={styles.suggestion}
								onClick={(): void => onToggle(field)}
								data-testid="list-columns-suggestion"
							>
								<span className={styles.checkSlot}>
									{checked && <Check size={14} />}
								</span>
								{field.name}
							</button>
						);
					})}
					{!isFetching && suggestions.length === 0 && (
						<div className={styles.empty}>No fields found</div>
					)}
					{isFetching && <div className={styles.empty}>Loading…</div>}
				</div>
			</PopoverContent>
		</Popover>
	);
}

export default AddColumnDropdown;
