import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { TooltipSimple } from '@signozhq/ui/tooltip';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

import { useDashboardStore } from '../../../store/useDashboardStore';
import styles from './AddVariable.module.scss';

interface AddVariableIconProps {
	/** Permissions the control needs; reported in the standard wording when denied. */
	checks: BrandedPermission[];
	/** A non-permission block, which outranks the checks. */
	disabledTooltip?: string;
	/** Whether editing is available at all, so the label is shown instead. */
	isEditable: boolean;
}

/**
 * Compact "+" trigger (label on hover) shown after the variable pills once at
 * least one variable exists. Opens the Variables settings tab with the add form
 * primed.
 */
function AddVariableIcon({
	checks,
	disabledTooltip,
	isEditable,
}: AddVariableIconProps): JSX.Element {
	const requestSettings = useDashboardStore((s) => s.requestSettings);

	const onClick = (): void =>
		requestSettings({ tab: 'Variables', addVariable: true });

	// An available trigger shows its label; an unavailable one is disabled and
	// explained by the authz button itself.
	if (isEditable) {
		return (
			<TooltipSimple side="top" title="Add variable">
				<Button
					variant="outlined"
					color="secondary"
					size="icon"
					className={styles.addVariableIcon}
					aria-label="Add variable"
					testId="dashboard-variables-add"
					onClick={onClick}
				>
					<Plus size={14} />
				</Button>
			</TooltipSimple>
		);
	}

	return (
		<AuthZButton
			checks={checks}
			disabledTooltip={disabledTooltip}
			variant="outlined"
			color="secondary"
			size="icon"
			className={styles.addVariableIcon}
			aria-label="Add variable"
			testId="dashboard-variables-add"
			onClick={onClick}
		>
			<Plus size={14} />
		</AuthZButton>
	);
}

export default AddVariableIcon;
