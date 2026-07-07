import { Plus } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';

import { useDashboardStore } from '../store/useDashboardStore';
import styles from './VariablesBar.module.scss';

/**
 * Full-width labelled "Add variable" button shown in the empty state, before any
 * variables exist. Opens the Variables settings tab with the add form primed.
 */
function AddVariableFull(): JSX.Element {
	const requestSettings = useDashboardStore((s) => s.requestSettings);

	return (
		<Button
			variant="outlined"
			color="secondary"
			size="md"
			className={styles.addVariable}
			prefix={<Plus size={14} />}
			testId="dashboard-variables-add"
			onClick={(): void =>
				requestSettings({ tab: 'Variables', addVariable: true })
			}
		>
			Add variable
		</Button>
	);
}

export default AddVariableFull;
