import { useId } from 'react';
import cx from 'classnames';

import { type Alignment, ALIGNMENT_CELLS, alignmentLabel } from './alignment';

import styles from './AlignmentGrid.module.scss';

interface AlignmentGridProps {
	testId: string;
	value: Alignment;
	description?: string;
	onChange: (next: Alignment) => void;
}

function AlignmentGrid({
	testId,
	value,
	description,
	onChange,
}: AlignmentGridProps): JSX.Element {
	const name = useId();

	return (
		<div className={styles.row}>
			<div
				role="radiogroup"
				aria-label="Text position"
				data-testid={testId}
				className={styles.grid}
			>
				{ALIGNMENT_CELLS.map((cell) => {
					const label = alignmentLabel(cell);
					const selected =
						cell.textAlign === value.textAlign &&
						cell.verticalAlign === value.verticalAlign;
					return (
						<label
							key={label}
							title={label}
							data-testid={`${testId}-${cell.verticalAlign}-${cell.textAlign}`}
							className={cx(styles.cell, { [styles.selected]: selected })}
						>
							<input
								type="radio"
								className={styles.input}
								name={name}
								checked={selected}
								aria-label={label}
								onChange={(): void => onChange(cell)}
							/>
							<span className={styles.mark} />
						</label>
					);
				})}
			</div>
			<div className={styles.text}>
				<span className={styles.label}>{alignmentLabel(value)}</span>
				{description && <span className={styles.description}>{description}</span>}
			</div>
		</div>
	);
}

export default AlignmentGrid;
