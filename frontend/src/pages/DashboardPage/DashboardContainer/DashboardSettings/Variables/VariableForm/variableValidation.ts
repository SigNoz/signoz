import type { VariableFormModel } from '../variableFormModel';

/**
 * Name validation, mirroring V1: empty / whitespace are rejected, and the name
 * set includes self, but keeping your own (original) name is always allowed.
 */
export function getNameError(
	name: string,
	existingNames: string[],
	originalName: string,
): string | null {
	if (name === '') {
		return 'Variable name is required';
	}
	if (/\s/.test(name)) {
		return 'Variable name cannot contain whitespaces';
	}
	if (name !== originalName && existingNames.includes(name)) {
		return 'Variable name already exists';
	}
	return null;
}

/** Rejects a dynamic variable reusing an attribute already bound elsewhere. */
export function getAttributeError(
	model: VariableFormModel,
	existingDynamicAttributes: string[],
): string | undefined {
	if (
		model.type === 'DYNAMIC' &&
		model.dynamicAttribute &&
		existingDynamicAttributes.includes(model.dynamicAttribute)
	) {
		return 'A variable with this attribute key already exists';
	}
	return undefined;
}
