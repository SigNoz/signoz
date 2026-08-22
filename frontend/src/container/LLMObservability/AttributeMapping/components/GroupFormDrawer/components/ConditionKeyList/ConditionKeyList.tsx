import { useState } from 'react';
import { Badge } from '@signozhq/ui/badge';
import { Button } from '@signozhq/ui/button';
import { Input } from '@signozhq/ui/input';
import { X } from '@signozhq/icons';

import FieldLabel from '../../../FieldLabel/FieldLabel';
import styles from './ConditionKeyList.module.scss';

interface ConditionKeyListProps {
	label: string;
	labelHint?: string;
	keys: string[];
	placeholder: string;
	addLabel: string;
	testIdPrefix: string;
	onChange: (keys: string[]) => void;
}

// Condition keys as removable chips. Chips are starred on both sides because
// the key is matched as a substring, not as a full key name.
function ConditionKeyList({
	label,
	labelHint,
	keys,
	placeholder,
	addLabel,
	testIdPrefix,
	onChange,
}: ConditionKeyListProps): JSX.Element {
	const [keyInput, setKeyInput] = useState<string>('');

	const addKey = (): void => {
		const next = keyInput.trim();
		if (!next || keys.includes(next)) {
			setKeyInput('');
			return;
		}
		onChange([...keys, next]);
		setKeyInput('');
	};

	const removeKey = (key: string): void => {
		onChange(keys.filter((existing) => existing !== key));
	};

	return (
		<div className={styles.field}>
			<FieldLabel
				label={label}
				hint={labelHint}
				className={styles.label}
				testId={`${testIdPrefix}-hint`}
			/>

			<div className={styles.keyBox}>
				{keys.length > 0 && (
					<div className={styles.keyChips} data-testid={`${testIdPrefix}-chips`}>
						{keys.map((key) => (
							<Badge
								key={key}
								color="vanilla"
								variant="outline"
								className={styles.keyChip}
								testId={`${testIdPrefix}-chip-${key}`}
							>
								<span className={styles.keyChipText} title={key}>
									{`*${key}*`}
								</span>
								<button
									type="button"
									aria-label={`Remove ${key}`}
									className={styles.keyChipRemove}
									onClick={(): void => removeKey(key)}
									data-testid={`${testIdPrefix}-remove-${key}`}
								>
									<X size={10} />
								</button>
							</Badge>
						))}
					</div>
				)}

				<div className={styles.keyAdd}>
					<Input
						className={styles.keyInput}
						placeholder={placeholder}
						value={keyInput}
						autoComplete="off"
						onChange={(event): void => setKeyInput(event.target.value)}
						onKeyDown={(event): void => {
							if (event.key === 'Enter') {
								event.preventDefault();
								addKey();
							}
						}}
						testId={`${testIdPrefix}-input`}
					/>
					<Button
						variant="outlined"
						color="secondary"
						aria-label={addLabel}
						onClick={addKey}
						testId={`${testIdPrefix}-add`}
					>
						+ Add
					</Button>
				</div>
			</div>
		</div>
	);
}

export default ConditionKeyList;
