import { Button } from '@signozhq/ui/button';
import { Plus, X } from '@signozhq/icons';

import { FieldContextValue } from 'container/LLMObservability/AttributeMapping/types';
import KeySearchInput from '../../../KeySearchInput/KeySearchInput';
import styles from './ConditionKeyList.module.scss';

interface ConditionKeyListProps {
	label: string;
	labelHint?: string;
	keys: string[];
	placeholder: string;
	addLabel: string;
	testIdPrefix: string;
	fieldContext: FieldContextValue;
	onChange: (keys: string[]) => void;
}

function ConditionKeyList({
	label,
	labelHint,
	keys,
	placeholder,
	addLabel,
	testIdPrefix,
	fieldContext,
	onChange,
}: ConditionKeyListProps): JSX.Element {
	const updateKey = (index: number, value: string): void => {
		onChange(keys.map((key, i) => (i === index ? value : key)));
	};

	const addKey = (): void => {
		onChange([...keys, '']);
	};

	const removeKey = (index: number): void => {
		onChange(keys.filter((_, i) => i !== index));
	};

	return (
		<div className={styles.field}>
			<span className={styles.label}>
				{label}
				{labelHint && <span className={styles.labelHint}> {labelHint}</span>}
			</span>

			{keys.length > 0 && (
				<div className={styles.keys}>
					{keys.map((key, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<div className={styles.keyRow} key={index}>
							<KeySearchInput
								className={styles.keyInput}
								placeholder={placeholder}
								value={key}
								fieldContext={fieldContext}
								onChange={(next): void => updateKey(index, next)}
								testId={`${testIdPrefix}-${index}`}
							/>
							<Button
								variant="ghost"
								color="secondary"
								size="icon"
								aria-label="Remove key"
								onClick={(): void => removeKey(index)}
								testId={`${testIdPrefix}-remove-${index}`}
							>
								<X size={14} />
							</Button>
						</div>
					))}
				</div>
			)}

			<Button
				variant="dashed"
				color="secondary"
				prefix={<Plus size={14} />}
				onClick={addKey}
				testId={`${testIdPrefix}-add`}
			>
				{addLabel}
			</Button>
		</div>
	);
}

export default ConditionKeyList;
