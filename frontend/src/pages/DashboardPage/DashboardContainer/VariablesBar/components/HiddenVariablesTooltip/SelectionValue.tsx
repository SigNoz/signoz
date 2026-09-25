import { Typography } from '@signozhq/ui/typography';

import type { VariableSelection } from '../../selectionTypes';
import { describeSelection } from '../../utils/selectionDisplay';
import styles from './HiddenVariablesTooltip.module.scss';

interface SelectionValueProps {
	selection?: VariableSelection;
}

/**
 * A variable's current value as tooltip content: `ALL`, a dash when unset, the lone
 * value on its own, or — when it holds several — one bullet per value so the list
 * doesn't read as one run-on string.
 */
function SelectionValue({ selection }: SelectionValueProps): JSX.Element {
	const display = describeSelection(selection);

	if (display.kind !== 'values') {
		return (
			<Typography.Text size="sm" className={styles.value}>
				{display.kind === 'all' ? 'ALL' : '—'}
			</Typography.Text>
		);
	}

	if (display.values.length === 1) {
		return (
			<Typography.Text size="sm" className={styles.value}>
				{display.values[0]}
			</Typography.Text>
		);
	}

	return (
		<ul className={styles.values}>
			{display.values.map((value) => (
				<Typography.Text asChild size="sm" className={styles.valueItem} key={value}>
					<li>{value}</li>
				</Typography.Text>
			))}
		</ul>
	);
}

export default SelectionValue;
