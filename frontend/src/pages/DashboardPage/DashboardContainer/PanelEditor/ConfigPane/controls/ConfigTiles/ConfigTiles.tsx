import { type ReactNode, useId } from 'react';
import cx from 'classnames';

import styles from './ConfigTiles.module.scss';

export interface ConfigTileItem<T extends string = string> {
	value: T;
	label: string;
	/** Accessible name when `label` alone is ambiguous (e.g. a bare symbol). */
	ariaLabel?: string;
	drawing?: ReactNode;
	/** Muted second line under the label. */
	description?: string;
	disabled?: boolean;
	/** Short tag in the tile's corner, e.g. what auto detection picked. */
	badge?: string;
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
							className={cx(styles.tile, {
								[styles.selected]: selected,
								[styles.disabled]: item.disabled,
							})}
						>
							<input
								type="radio"
								className={styles.input}
								name={name}
								value={item.value}
								checked={selected}
								disabled={item.disabled}
								aria-label={item.ariaLabel ?? item.label}
								onChange={(): void => onChange(item.value)}
							/>
							{item.badge && <span className={styles.badge}>{item.badge}</span>}
							{item.drawing}
							{item.description ? (
								<span className={styles.text}>
									<span className={styles.label}>{item.label}</span>
									<span className={styles.description}>{item.description}</span>
								</span>
							) : (
								<span className={styles.label}>{item.label}</span>
							)}
						</label>
					);
				})}
			</div>
		</div>
	);
}

export default ConfigTiles;
