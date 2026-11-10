import type { ControlDescriptor, MockControl } from './types';

interface ControlOptions {
	/** Controls-panel group, so a page's knobs stay together. */
	group: string;
	description?: string;
}

const describe = (
	name: string,
	{ group, description }: ControlOptions,
	value: unknown,
): ControlDescriptor => ({
	name,
	description,
	table: {
		category: group,
		defaultValue: { summary: JSON.stringify(value) },
	},
});

export const toggleControl = (
	name: string,
	options: ControlOptions & { value: boolean },
): MockControl<boolean> => ({
	defaultValue: options.value,
	argType: {
		...describe(name, options, options.value),
		control: { type: 'boolean' },
	},
});

/**
 * Item count for a list. `max` should go past what the page renders so a story
 * can show the cap being hit.
 */
export const countControl = (
	name: string,
	options: ControlOptions & { value: number; max: number },
): MockControl<number> => ({
	defaultValue: options.value,
	argType: {
		...describe(name, options, options.value),
		control: { type: 'range', min: 0, max: options.max, step: 1 },
	},
});

export const choiceControl = <TOption extends string>(
	name: string,
	options: ControlOptions & { value: TOption; options: readonly TOption[] },
): MockControl<TOption> => ({
	defaultValue: options.value,
	argType: {
		...describe(name, options, options.value),
		control: { type: 'select' },
		options: [...options.options],
	},
});

export const multiChoiceControl = <TOption extends string>(
	name: string,
	options: ControlOptions & {
		value: readonly TOption[];
		options: readonly TOption[];
	},
): MockControl<TOption[]> => ({
	defaultValue: [...options.value],
	argType: {
		...describe(name, options, options.value),
		control: { type: 'check' },
		options: [...options.options],
	},
});
