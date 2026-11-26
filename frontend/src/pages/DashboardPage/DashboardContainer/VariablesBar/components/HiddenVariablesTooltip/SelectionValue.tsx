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
			<Typography
				variant="paragraph"
				size="small"
				weight="medium"
				color="inherit"
				as="p"
				textOverflow="wrap"
			>
				{display.kind === 'all' ? 'ALL' : '—'}
			</Typography>
		);
	}

	if (display.values.length === 1) {
		return (
			<Typography
				variant="paragraph"
				size="small"
				weight="medium"
				color="inherit"
				as="p"
				textOverflow="wrap"
			>
				{display.values[0]}
			</Typography>
		);
	}

	return (
		<ul className={styles.values}>
			{display.values.map((value) => (
				<Typography
					key={value}
					variant="paragraph"
					size="small"
					weight="medium"
					color="inherit"
					as="li"
					textOverflow="wrap"
				>
					{value}
				</Typography>
			))}
		</ul>
	);
}

export default SelectionValue;
