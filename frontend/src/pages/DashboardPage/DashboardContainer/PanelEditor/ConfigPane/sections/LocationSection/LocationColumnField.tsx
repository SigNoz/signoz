import { Button } from '@signozhq/ui/button';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigSelect, {
	type ConfigSelectItem,
} from '../../controls/ConfigSelect/ConfigSelect';

import styles from './LocationSection.module.scss';

interface LocationColumnFieldProps {
	testId: string;
	label: string;
	/** What the column holds, for the no-match message: `country`, `latitude`… */
	noun: string;
	/** The configured column; empty is Auto. */
	value: string | undefined;
	/** The column Auto reads, if any. */
	autoColumn: string | undefined;
	groupColumns: string[];
	onChange: (column: string) => void;
}

/** A group-by column picker whose Auto names the column it found, or says it found none. */
function LocationColumnField({
	testId,
	label,
	noun,
	value,
	autoColumn,
	groupColumns,
	onChange,
}: LocationColumnFieldProps): JSX.Element {
	const isMissing = !!value && !groupColumns.includes(value);
	const items: ConfigSelectItem[] = [
		{ value: '', label: autoColumn ? `Auto · ${autoColumn}` : 'Auto · no match' },
		...groupColumns.map((column) => ({ value: column, label: column })),
		...(isMissing
			? [{ value: value as string, label: `${value} (not in results)` }]
			: []),
	];

	let help: JSX.Element | undefined;
	if (isMissing) {
		help = (
			<span className={styles.error}>
				{value} isn&apos;t in the query results. The query groups by{' '}
				{groupColumns.join(', ')}.
			</span>
		);
	} else if (!value && !autoColumn && groupColumns.length > 0) {
		help = (
			<span className={styles.error}>
				No group-by column looks like a {noun}. Pick one from the list.
			</span>
		);
	}

	return (
		<ConfigField
			label={label}
			changed={!!value}
			onReset={(): void => onChange('')}
			help={help}
		>
			<ConfigSelect
				testId={testId}
				value={value ?? ''}
				items={items}
				onChange={onChange}
			/>
			{isMissing && autoColumn && (
				<div className={styles.fix}>
					<Button
						variant="outlined"
						color="secondary"
						size="sm"
						testId={`${testId}-fix`}
						onClick={(): void => onChange('')}
					>
						Use <span className={styles.mono}>{autoColumn}</span>
					</Button>
				</div>
			)}
		</ConfigField>
	);
}

export default LocationColumnField;
