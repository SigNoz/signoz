import TooltipScrollArea from 'components/TooltipScrollArea/TooltipScrollArea';
import { Typography } from '@signozhq/ui/typography';

import type { VariableFormModel } from '../../../DashboardSettings/Variables/variableFormModel';
import type { VariableSelectionMap } from '../../selectionTypes';
import SelectionValue from './SelectionValue';
import styles from './HiddenVariablesTooltip.module.scss';

interface HiddenVariablesTooltipProps {
	/** The variables the collapsed bar isn't showing, in bar order. */
	variables: VariableFormModel[];
	selections: VariableSelectionMap;
}

/**
 * Body of the collapsed bar's `+N` tooltip: what each hidden variable is set to.
 * Name and value sit on their own lines — `$name` muted above its value, which
 * bullets out when there are several — so the two read apart at a glance instead of
 * running together as `name: value`.
 * Every hidden variable is listed; the box scrolls rather than truncating.
 */
function HiddenVariablesTooltip({
	variables,
	selections,
}: HiddenVariablesTooltipProps): JSX.Element {
	return (
		<TooltipScrollArea>
			<div className={styles.tooltip} data-testid="hidden-variables-tooltip">
				{variables.map((variable) => (
					<div className={styles.row} key={variable.name}>
						<Typography.Text size="xs" color="muted" className={styles.name}>
							${variable.name}
						</Typography.Text>
						<SelectionValue selection={selections[variable.name]} />
					</div>
				))}
			</div>
		</TooltipScrollArea>
	);
}

export default HiddenVariablesTooltip;
