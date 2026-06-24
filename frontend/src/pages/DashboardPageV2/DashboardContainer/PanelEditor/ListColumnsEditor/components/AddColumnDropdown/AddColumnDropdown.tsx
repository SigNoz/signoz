import { useState } from 'react';
import { Button } from '@signozhq/ui/button';
import {
	Combobox,
	ComboboxCommand,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxLoading,
	ComboboxTrigger,
} from '@signozhq/ui/combobox';
import { Plus } from '@signozhq/icons';
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
 * The "+" affordance for the List columns editor: a searchable combobox of
 * field-key suggestions. Picking a suggestion toggles it (checkmark = selected);
 * a non-matching search term can be added verbatim so not-yet-indexed fields are
 * still selectable. Search is server-side, so cmdk filtering is disabled.
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
	const showCustomAdd = trimmed.length > 0 && !hasExactMatch;

	return (
		<Combobox open={open} onOpenChange={setOpen}>
			<ComboboxTrigger asChild>
				<Button
					type="button"
					variant="outlined"
					color="secondary"
					size="icon"
					className={styles.addBtn}
					aria-label="Add column"
					// `data-testid` (not the `testId` prop) survives the trigger's
					// `asChild` Slot merge, which otherwise resets it to undefined.
					data-testid="list-columns-add"
				>
					<Plus size={16} />
				</Button>
			</ComboboxTrigger>
			<ComboboxContent arrow side="top" align="end" className={styles.dropdown}>
				<ComboboxCommand shouldFilter={false}>
					<ComboboxInput
						value={searchText}
						onValueChange={setSearchText}
						placeholder="Search fields"
						testId="list-columns-search"
					/>
					<ComboboxList>
						{showCustomAdd && (
							<ComboboxItem
								value={trimmed}
								onSelect={(): void => onToggle({ name: trimmed })}
								data-testid="list-columns-add-custom"
							>
								Add &quot;{trimmed}&quot;
							</ComboboxItem>
						)}
						{suggestions.map((field) => (
							<ComboboxItem
								key={field.name}
								value={field.name}
								isSelected={selectedNames.has(field.name)}
								onSelect={(): void => onToggle(field)}
								data-testid="list-columns-suggestion"
							>
								{field.name}
							</ComboboxItem>
						))}
						{isFetching && <ComboboxLoading>Loading…</ComboboxLoading>}
						{!isFetching && !showCustomAdd && suggestions.length === 0 && (
							<ComboboxEmpty>No fields found</ComboboxEmpty>
						)}
					</ComboboxList>
				</ComboboxCommand>
			</ComboboxContent>
		</Combobox>
	);
}

export default AddColumnDropdown;
