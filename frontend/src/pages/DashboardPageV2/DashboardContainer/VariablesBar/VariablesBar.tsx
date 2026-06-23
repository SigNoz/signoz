import type { DashboardtypesGettableDashboardV2DTO } from 'api/generated/services/sigNoz.schemas';

import { useVariableSelection } from './useVariableSelection';
import VariableSelector from './VariableSelector';
import styles from './VariablesBar.module.scss';

interface VariablesBarProps {
	dashboard: DashboardtypesGettableDashboardV2DTO;
}

/**
 * Runtime variable selector bar shown above the panels. Renders one control per
 * dashboard variable; selections live in the store + URL (never the spec).
 */
function VariablesBar({ dashboard }: VariablesBarProps): JSX.Element | null {
	const { variables, dependencyData, selection, setSelection } =
		useVariableSelection(dashboard);

	if (variables.length === 0) {
		return null;
	}

	return (
		<div className={styles.bar} data-testid="dashboard-variables-bar">
			{variables.map((variable) => (
				<VariableSelector
					key={variable.name}
					variable={variable}
					variables={variables}
					parents={dependencyData.parentGraph[variable.name] ?? []}
					selections={selection}
					selection={
						selection[variable.name] ?? {
							value: variable.multiSelect ? [] : '',
							allSelected: false,
						}
					}
					onChange={(next): void => setSelection(variable.name, next)}
				/>
			))}
		</div>
	);
}

export default VariablesBar;
