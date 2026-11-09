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
					/* TODO(typography): asChild has no equivalent */ key={value}
					variant="paragraph"
					size="small"
					weight="medium"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					<li>{value}</li>
				</Typography>
			))}
		</ul>
	);
}

export default SelectionValue;
