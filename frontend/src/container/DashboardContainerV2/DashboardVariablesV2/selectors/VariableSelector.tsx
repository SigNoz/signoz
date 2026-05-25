import { useCallback } from 'react';
import type {
	DashboardtypesListVariableSpecDTO,
	DashboardTextVariableSpecDTO,
	DashboardtypesVariableDTO,
} from 'api/generated/services/sigNoz.schemas';

import { useResolveVariable } from '../resolution/useResolveVariable';
import { useVariableSelectionStore } from '../state/selectionStore';
import type { VariableSelection } from '../state/types';
import ListVariableSelector from './ListVariableSelector';
import SelectorLabel from './SelectorLabel';
import TextVariableSelector from './TextVariableSelector';

interface Props {
	variable: DashboardtypesVariableDTO;
}

/**
 * Routes one variable to its kind-specific selector. Owns the selection
 * store binding so the kind-specific components stay dumb.
 */
function VariableSelector({ variable }: Props): JSX.Element | null {
	const isText = variable.kind === 'TextVariable';
	const spec = variable.spec as
		| DashboardtypesListVariableSpecDTO
		| DashboardTextVariableSpecDTO
		| undefined;
	const name = spec?.name ?? '';

	const selection = useVariableSelectionStore((s) =>
		name ? s.selections[name] : undefined,
	);
	const setSelection = useVariableSelectionStore((s) => s.setSelection);
	const resolved = useResolveVariable({ variable });

	const setListSelection = useCallback(
		(next: VariableSelection): void => setSelection(name, next),
		[name, setSelection],
	);
	const clearSelection = useCallback((): void => setSelection(name, undefined), [
		name,
		setSelection,
	]);

	if (!name) return null;

	const description = spec?.display?.name ?? '';

	if (isText) {
		const textSpec = spec as DashboardTextVariableSpecDTO;
		const current =
			selection?.kind === 'text' ? selection.value : textSpec?.value ?? '';
		return (
			<div className="variable-item">
				<SelectorLabel name={name} description={description} />
				<div className="variable-value">
					<TextVariableSelector
						value={current}
						onCommit={(v): void => setSelection(name, { kind: 'text', value: v })}
					/>
				</div>
			</div>
		);
	}

	const listSpec = spec as DashboardtypesListVariableSpecDTO;
	const defaultValue =
		typeof listSpec?.defaultValue === 'string'
			? (listSpec.defaultValue as string)
			: '';

	return (
		<div className="variable-item">
			<SelectorLabel name={name} description={description} />
			<div className="variable-value">
				<ListVariableSelector
					variableId={name}
					resolved={resolved}
					selection={selection}
					allowMultiple={!!listSpec?.allowMultiple}
					allowAllValue={!!listSpec?.allowAllValue}
					defaultValue={defaultValue}
					onChange={setListSelection}
					onClear={clearSelection}
				/>
			</div>
		</div>
	);
}

export default VariableSelector;
