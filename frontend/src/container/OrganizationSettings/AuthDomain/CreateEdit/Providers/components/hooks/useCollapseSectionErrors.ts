import { useMemo } from 'react';
import { Form } from 'antd';

export interface CollapseSectionErrors {
	hasErrors: boolean;
	errorMessages: string[];
}

/**
 * Detects validation errors in a form section
 * @param fieldNamePrefix - Field path prefix for the section
 */
export function useCollapseSectionErrors(
	fieldNamePrefix: string[],
): CollapseSectionErrors {
	const form = Form.useFormInstance();
	Form.useWatch([], form);

	return useMemo(() => {
		const fieldErrors = form.getFieldsError();
		const prefixPath = fieldNamePrefix.join('.');
		const messages: string[] = [];

		fieldErrors.forEach((field) => {
			const fieldPath = Array.isArray(field.name)
				? field.name.join('.')
				: String(field.name);

			if (fieldPath.startsWith(prefixPath) && field.errors.length > 0) {
				field.errors.forEach((error) => messages.push(error));
			}
		});

		return {
			hasErrors: messages.length > 0,
			errorMessages: messages,
		};
	}, [form, fieldNamePrefix]);
}
