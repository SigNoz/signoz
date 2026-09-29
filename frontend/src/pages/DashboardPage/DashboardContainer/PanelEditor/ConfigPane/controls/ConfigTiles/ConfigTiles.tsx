import { type ReactNode, useId } from 'react';
import cx from 'classnames';

import styles from './ConfigTiles.module.scss';

export interface ConfigTileItem<T extends string = string> {
	value: T;
	label: string;
	drawing?: ReactNode;
}

interface ConfigTilesProps<T extends string> {
	testId: string;
	value: T | undefined;
	items: ConfigTileItem<T>[];
	onChange: (value: T) => void;
	/** Compact text-only tiles on one row (e.g. decimal places). */
	compact?: boolean;
	'aria-label'?: string;
}

/**
 * Single-choice tiles. Columns follow the container width: rows of 4 fold to 2×2 and
 * any row too narrow for its tiles becomes a full-width list.
 */
function ConfigTiles<T extends string>({
	testId,
	value,
	items,
	onChange,
	compact,
	'aria-label': ariaLabel,
}: ConfigTilesProps<T>): JSX.Element {
	const name = useId();

	return (
		<div className={styles.container}>
			<div
				role="radiogroup"
				aria-label={ariaLabel}
				data-testid={testId}
				data-count={items.length}
				className={cx(styles.grid, { [styles.compact]: compact })}
			>
				{items.map((item) => {
					const selected = item.value === value;
					return (
						<label
							key={item.value}
							data-testid={`${testId}-${item.value}`}
							className={cx(styles.tile, { [styles.selected]: selected })}
						>
							<input
								type="radio"
								className={styles.input}
								name={name}
								value={item.value}
								checked={selected}
								aria-label={item.label}
								onChange={(): void => onChange(item.value)}
							/>
							{item.drawing}
							<span className={styles.label}>{item.label}</span>
						</label>
					);
				})}
			</div>
		</div>
	);
}

export default ConfigTiles;
