import { useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { Plus } from '@signozhq/icons';
import type {
	TelemetrytypesSignalDTO,
	TelemetrytypesTelemetryFieldKeyDTO,
} from 'api/generated/services/sigNoz.schemas';

import { useListColumnSuggestions } from '../../hooks/useListColumnSuggestions';

interface AddColumnDropdownProps {
	signal: TelemetrytypesSignalDTO;
	/** Names already chosen — drives the checked state + toggle behavior. */
	selectedNames: Set<string>;
	onToggle: (field: TelemetrytypesTelemetryFieldKeyDTO) => void;
}

/**
 * The "+" affordance for the List columns editor: a searchable menu of
 * field-key suggestions. Picking a suggestion toggles it (checkmark = selected);
 * a non-matching search term can be added verbatim so not-yet-indexed fields are
 * still selectable. Search is server-side, so the menu does not filter the rows.
 */
function AddColumnDropdown({
	signal,
	selectedNames,
	onToggle,
}: AddColumnDropdownProps): JSX.Element {
	const { searchText, setSearchText, suggestions, isFetching } =
		useListColumnSuggestions(signal);

	const trimmed = searchText.trim();
	const hasExactMatch = suggestions.some((field) => field.name === trimmed);
	const showCustomAdd = trimmed.length > 0 && !hasExactMatch;

	const items = useMemo((): DropdownItemType[] => {
		const rows: DropdownItemType[] = [];

		if (showCustomAdd) {
			rows.push({
				type: 'item',
				value: trimmed,
				label: `Add "${trimmed}"`,
				testId: 'list-columns-add-custom',
				onClick: (): void => onToggle({ name: trimmed }),
			});
		}

		suggestions.forEach((field) => {
			rows.push({
				type: 'checkbox',
				name: field.name,
				label: field.name,
				value: selectedNames.has(field.name),
				testId: 'list-columns-suggestion',
				onChange: (): void => onToggle(field),
			});
		});

		return rows;
	}, [onToggle, selectedNames, showCustomAdd, suggestions, trimmed]);

	return (
		<Dropdown
			nativeButton
			align="end"
			side="bottom"
			items={items}
			contentMaxWidth={260}
			loading={isFetching && items.length === 0}
			loadingContent="Loading…"
			noContent="No fields found"
			searchInputProps={{
				placeholder: 'Search fields',
				filter: false,
				loading: isFetching && items.length > 0,
				onChange: setSearchText,
			}}
		>
			<Button
				type="button"
				variant="outlined"
				color="secondary"
				size="sm"
				icon
				aria-label="Add column"
				testId="list-columns-add"
			>
				<Plus size={16} />
			</Button>
		</Dropdown>
	);
}

export default AddColumnDropdown;
