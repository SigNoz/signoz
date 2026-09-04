import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';

import { useDashboardStore } from '../../../store/useDashboardStore';
import styles from './AddVariable.module.scss';

/**
 * `disabledReason` is the only input: a non-empty reason both disables the
 * trigger and explains it, so a dead control with no explanation cannot be
 * expressed.
 */
interface AddVariableIconProps {
	disabledReason?: string;
}

/**
 * Compact "+" trigger (label on hover) shown after the variable pills once at
 * least one variable exists. Opens the Variables settings tab with the add form
 * primed.
 */
function AddVariableIcon({
	disabledReason = '',
}: AddVariableIconProps): JSX.Element {
	const requestSettings = useDashboardStore((s) => s.requestSettings);

	return (
		<TooltipSimple side="top" title={disabledReason || 'Add variable'}>
			<Button
				variant="outlined"
				color="secondary"
				size="icon"
				className={styles.addVariableIcon}
				aria-label="Add variable"
				testId="dashboard-variables-add"
				disabled={!!disabledReason}
				onClick={(): void =>
					requestSettings({ tab: 'Variables', addVariable: true })
				}
			>
				<Plus size={14} />
			</Button>
		</TooltipSimple>
	);
}

export default AddVariableIcon;
