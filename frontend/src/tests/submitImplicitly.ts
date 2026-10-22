import { fireEvent } from '@testing-library/react';

const FIELDS_BLOCKING_IMPLICIT_SUBMISSION = new Set([
	'text',
	'search',
	'url',
	'tel',
	'email',
	'password',
	'date',
	'month',
	'week',
	'time',
	'datetime-local',
	'number',
]);

function isSubmitButton(
	control: Element,
): control is HTMLButtonElement | HTMLInputElement {
	return (
		(control instanceof HTMLButtonElement ||
			control instanceof HTMLInputElement) &&
		control.type === 'submit'
	);
}

/**
 * Presses Enter in `field` the way a browser does (HTML implicit submission).
 *
 * user-event 14 looks for the submit button with `form.querySelector`, so it
 * misses one tied to the form through the `form` attribute and submits the
 * form directly.
 */
export function submitImplicitly(field: HTMLInputElement): void {
	const { form } = field;
	if (!form) {
		return;
	}

	const controls = Array.from(form.elements);
	const defaultButton = controls.find(isSubmitButton);
	if (defaultButton) {
		if (!defaultButton.disabled) {
			fireEvent.click(defaultButton);
		}
		return;
	}

	const blockingFields = controls.filter(
		(control) =>
			control instanceof HTMLInputElement &&
			FIELDS_BLOCKING_IMPLICIT_SUBMISSION.has(control.type),
	);
	if (blockingFields.length === 1) {
		fireEvent.submit(form);
	}
}
