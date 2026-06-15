import { Button } from '@signozhq/ui/button';
import { Plus, X } from '@signozhq/icons';

import KeySearchInput from './KeySearchInput';
import { FieldContextValue } from './types';

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

// Editor for one list of condition keys (the group's span-attribute or
// resource gating keys). Substring "contains" match, order irrelevant.
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
		<div className="group-form__field">
			<span className="group-form__label">
				{label}
				{labelHint && <span className="group-form__label-hint"> {labelHint}</span>}
			</span>

			{keys.length > 0 && (
				<div className="group-form__keys">
					{keys.map((key, index) => (
						// eslint-disable-next-line react/no-array-index-key
						<div className="group-form__key" key={index}>
							<KeySearchInput
								className="group-form__key-input"
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
