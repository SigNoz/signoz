import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import DisabledReasonTooltip from 'lib/authz/components/DisabledReasonTooltip/DisabledReasonTooltip';

import { useDashboardStore } from '../../../store/useDashboardStore';
import styles from './AddVariable.module.scss';

/**
 * `disabledReason` is the only input: a non-empty reason both disables the
 * trigger and explains it, so a dead control with no explanation cannot be
 * expressed.
 */
interface AddVariableIconProps {
	disabledReason?: string;
	disabledKind: 'denied' | 'blocked';
}

/**
 * Compact "+" trigger (label on hover) shown after the variable pills once at
 * least one variable exists. Opens the Variables settings tab with the add form
 * primed.
 */
function AddVariableIcon({
	disabledReason = '',
	disabledKind,
}: AddVariableIconProps): JSX.Element {
	const requestSettings = useDashboardStore((s) => s.requestSettings);

	const trigger = (
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
	);

	// A disabled trigger explains itself through the shared reason tooltip; an
	// enabled one just gets its label.
	if (disabledReason) {
		return (
			<DisabledReasonTooltip reason={disabledReason} kind={disabledKind}>
				{trigger}
			</DisabledReasonTooltip>
		);
	}

	return (
		<TooltipSimple side="top" title="Add variable">
			{trigger}
		</TooltipSimple>
	);
}

export default AddVariableIcon;
