import { useMemo } from 'react';
import { Form } from 'antd';

export interface CollapseSectionErrors {
	hasErrors: boolean;
	errorMessages: string[];
}

/**
 * Detects validation errors in a form section
 * @param fieldNamePrefix - Field path prefix for the section
 * @param specificFields - Optional specific field prefixes to check (uses prefix matching)
 */
export function useCollapseSectionErrors(
	fieldNamePrefix: string[],
	specificFields?: string[][],
): CollapseSectionErrors {
	const form = Form.useFormInstance();
	Form.useWatch([], form);

	// eslint-disable-next-line sonarjs/cognitive-complexity
	return useMemo(() => {
		const fieldErrors = form.getFieldsError();
		const messages: string[] = [];

		if (specificFields?.length) {
			fieldErrors.forEach((field) => {
				const fieldPath = Array.isArray(field.name) ? field.name : [field.name];

				const isMatch = specificFields.some((specificField) => {
					if (fieldPath.length < specificField.length) {
						return false;
					}
					return specificField.every((part, idx) => fieldPath[idx] === part);
				});

				if (isMatch && field.errors.length > 0) {
					field.errors.forEach((error) => messages.push(error));
				}
			});
		} else {
			const prefixPath = fieldNamePrefix.join('.');

			fieldErrors.forEach((field) => {
				const fieldPath = Array.isArray(field.name)
					? field.name.join('.')
					: String(field.name);

				if (fieldPath.startsWith(prefixPath) && field.errors.length > 0) {
					field.errors.forEach((error) => messages.push(error));
				}
			});
		}

		return {
			hasErrors: messages.length > 0,
			errorMessages: messages,
		};
	}, [form, fieldNamePrefix, specificFields]);
}
