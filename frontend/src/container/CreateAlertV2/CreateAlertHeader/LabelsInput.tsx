import { CloseOutlined } from '@ant-design/icons';
import { useNotifications } from 'hooks/useNotifications';
import React, { useCallback, useState } from 'react';

import { LabelInputState, LabelsInputProps } from './types';

function LabelsInput({
	labels,
	onLabelsChange,
	validateLabelsKey,
}: LabelsInputProps): JSX.Element {
	const { notifications } = useNotifications();
	const [inputState, setInputState] = useState<LabelInputState>({
		key: '',
		value: '',
		isKeyInput: true,
	});
	const [isAdding, setIsAdding] = useState(false);

	const handleAddLabelsClick = useCallback(() => {
		setIsAdding(true);
		setInputState({ key: '', value: '', isKeyInput: true });
	}, []);

	const handleKeyDown = useCallback(
		// eslint-disable-next-line sonarjs/cognitive-complexity
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				if (inputState.isKeyInput) {
					// Check if input contains a colon (key:value format)
					if (inputState.key.includes(':')) {
						const [key, ...valueParts] = inputState.key.split(':');
						const value = valueParts.join(':'); // Rejoin in case value contains colons

						if (key.trim() && value.trim()) {
							if (labels[key.trim()]) {
								notifications.error({
									message: 'Label with this key already exists',
								});
								return;
							}
							const error = validateLabelsKey(key.trim());
							if (error) {
								notifications.error({
									message: error,
								});
								return;
							}
							// Add the label immediately
							const newLabels = {
								...labels,
								[key.trim()]: value.trim(),
							};
							onLabelsChange(newLabels);

							// Reset input state
							setInputState({ key: '', value: '', isKeyInput: true });
						}
					} else if (inputState.key.trim()) {
						if (labels[inputState.key.trim()]) {
							notifications.error({
								message: 'Label with this key already exists',
							});
							return;
						}
						const error = validateLabelsKey(inputState.key.trim());
						if (error) {
							notifications.error({
								message: error,
							});
							return;
						}
						setInputState((prev) => ({ ...prev, isKeyInput: false }));
					}
				} else if (inputState.value.trim()) {
					// Add the label
					const newLabels = {
						...labels,
						[inputState.key.trim()]: inputState.value.trim(),
					};
					onLabelsChange(newLabels);

					// Reset and continue adding
					setInputState({ key: '', value: '', isKeyInput: true });
				}
			} else if (e.key === 'Escape') {
				// Cancel adding
				setIsAdding(false);
				setInputState({ key: '', value: '', isKeyInput: true });
			}
		},
		[inputState, labels, notifications, onLabelsChange, validateLabelsKey],
	);

	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			if (inputState.isKeyInput) {
				setInputState((prev) => ({ ...prev, key: e.target.value }));
			} else {
				setInputState((prev) => ({ ...prev, value: e.target.value }));
			}
		},
		[inputState.isKeyInput],
	);

	const handleRemoveLabel = useCallback(
		(key: string) => {
			const newLabels = { ...labels };
			delete newLabels[key];
			onLabelsChange(newLabels);
		},
		[labels, onLabelsChange],
	);

	const handleBlur = useCallback(() => {
		if (!inputState.key && !inputState.value) {
			setIsAdding(false);
			setInputState({ key: '', value: '', isKeyInput: true });
		}
	}, [inputState]);

	return (
		<div className="labels-input">
			{Object.keys(labels).length > 0 && (
				<div className="labels-input__existing-labels">
					{Object.entries(labels).map(([key, value]) => (
						<span
							key={key}
							className="labels-input__label-pill"
							data-testid={`label-pill-${key}-${value}`}
						>
							{key}: {value}
							<button
								type="button"
								className="labels-input__remove-button"
								onClick={(): void => handleRemoveLabel(key)}
							>
								<CloseOutlined />
							</button>
						</span>
					))}
				</div>
			)}

			{!isAdding ? (
				<button
					className="labels-input__add-button"
					type="button"
					onClick={handleAddLabelsClick}
					data-testid="alert-add-label-button"
				>
					+ Add labels
				</button>
			) : (
				<div className="labels-input__input-container">
					<input
						type="text"
						value={inputState.isKeyInput ? inputState.key : inputState.value}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						className="labels-input__input"
						placeholder={inputState.isKeyInput ? 'Enter key' : 'Enter value'}
						// eslint-disable-next-line jsx-a11y/no-autofocus
						autoFocus
						data-testid="alert-add-label-input"
					/>
				</div>
			)}
		</div>
	);
}

export default LabelsInput;
