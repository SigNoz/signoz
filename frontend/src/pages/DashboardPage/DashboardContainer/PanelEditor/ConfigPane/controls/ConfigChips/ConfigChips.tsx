import cx from 'classnames';

import styles from './ConfigChips.module.scss';

export interface ConfigChipItem<T extends string = string> {
	value: T;
	label: string;
}

interface ConfigChipsProps<T extends string> {
	testId: string;
	/** Selected values, kept in `items` order. */
	value: T[];
	items: ConfigChipItem<T>[];
	onChange: (value: T[]) => void;
	'aria-label'?: string;
}

/** Multi-choice toggle chips; any number may be on, including none. */
function ConfigChips<T extends string>({
	testId,
	value,
	items,
	onChange,
	'aria-label': ariaLabel,
}: ConfigChipsProps<T>): JSX.Element {
	const toggle = (item: T): void => {
		const next = value.includes(item)
			? value.filter((selected) => selected !== item)
			: [...value, item];
		onChange(
			items
				.map((candidate) => candidate.value)
				.filter((candidate) => next.includes(candidate)),
		);
	};

	return (
		<fieldset
			aria-label={ariaLabel}
			data-testid={testId}
			className={styles.chips}
		>
			{items.map((item) => {
				const selected = value.includes(item.value);
				return (
					<label
						key={item.value}
						data-testid={`${testId}-${item.value}`}
						className={cx(styles.chip, { [styles.selected]: selected })}
						title={item.label}
					>
						<input
							type="checkbox"
							className={styles.input}
							checked={selected}
							aria-label={item.label}
							onChange={(): void => toggle(item.value)}
						/>
						<span className={styles.label}>{item.label}</span>
					</label>
				);
			})}
		</fieldset>
	);
}

export default ConfigChips;
