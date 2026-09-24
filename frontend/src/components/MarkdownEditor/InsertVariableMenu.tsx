import { useMemo, useState } from 'react';
import { ChevronDown, DollarSign } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import {
	DropdownMenuSimple,
	type MenuItem,
} from 'components/DropdownMenu/DropdownMenuSimple';

import { READ_ONLY_TOOLTIP } from './constants';
import type { EditorVariable } from './types';

import styles from './MarkdownEditor.module.scss';

interface InsertVariableMenuProps {
	variables: EditorVariable[];
	/** Receives the variable name; the caller decides the token syntax. */
	onSelect: (name: string) => void;
	disabled: boolean;
}

function toMenuItems(
	variables: EditorVariable[],
	onSelect: (name: string) => void,
): MenuItem[] {
	return variables.map((variable) => ({
		key: variable.name,
		label: (
			<span
				className={styles.variableRow}
				data-testid={`markdown-variable-${variable.name}`}
			>
				<span className={styles.variableName}>{`$${variable.name}`}</span>
				{variable.badge && (
					<span className={styles.variableBadge}>{variable.badge}</span>
				)}
			</span>
		),
		onClick: (): void => onSelect(variable.name),
	}));
}

/** Searchable variable picker; hidden entirely when there is nothing to insert. */
function InsertVariableMenu({
	variables,
	onSelect,
	disabled,
}: InsertVariableMenuProps): JSX.Element | null {
	const [search, setSearch] = useState('');

	const matches = useMemo(() => {
		const query = search.trim().toLowerCase();
		return query
			? variables.filter((variable) => variable.name.toLowerCase().includes(query))
			: variables;
	}, [variables, search]);

	const items = useMemo(
		() => toMenuItems(matches, onSelect),
		[matches, onSelect],
	);

	if (variables.length === 0) {
		return null;
	}

	return (
		<DropdownMenuSimple
			contentMaxWidth={320}
			disabled={disabled}
			disabledTooltip={READ_ONLY_TOOLTIP}
			menu={{
				items,
				search: {
					placeholder: 'Search variables',
					onSearchChange: setSearch,
				},
			}}
		>
			<Button
				type="button"
				variant="outlined"
				color="secondary"
				size="sm"
				prefix={<DollarSign size={14} className={styles.insertVariableIcon} />}
				suffix={<ChevronDown size={14} />}
				testId="markdown-insert-variable"
			>
				Insert variable
			</Button>
		</DropdownMenuSimple>
	);
}

export default InsertVariableMenu;
