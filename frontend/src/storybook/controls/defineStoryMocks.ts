import type {
	ControlDescriptor,
	MockControlMap,
	MockControlValues,
	StoryMocks,
	StoryMocksDefinition,
} from './types';
import type { SignozStoryConfig, StoryOwnedConfig } from '../types';

/**
 * Turns a page's control declarations into the `args` / `argTypes` its meta
 * exposes and the reader the runtime uses to fold the panel's current values
 * back into mock responses.
 */
export const defineStoryMocks = <TControls extends MockControlMap>(
	definition: StoryMocksDefinition<TControls>,
): StoryMocks<TControls> => {
	const entries = Object.entries(definition.controls);

	const args = Object.fromEntries(
		entries.map(([name, control]) => [name, control.defaultValue]),
	) as MockControlValues<TControls>;

	const argTypes: Record<string, ControlDescriptor> = Object.fromEntries(
		entries.map(([name, control]) => [name, control.argType]),
	);

	return {
		...definition,
		args,
		argTypes,
		read: (storyArgs): MockControlValues<TControls> =>
			Object.fromEntries(
				entries.map(([name, control]) => [
					name,
					storyArgs[name] ?? control.defaultValue,
				]),
			) as MockControlValues<TControls>,
	};
};

interface StoryMocksMeta<TControls extends MockControlMap> {
	args: MockControlValues<TControls>;
	argTypes: Record<string, ControlDescriptor>;
	parameters: { signoz: SignozStoryConfig };
}

/**
 * Meta fragment a page spreads to publish its controls:
 * `...storyMocks(homeMocks, { route: ROUTES.HOME })`.
 */
export const storyMocks = <TControls extends MockControlMap>(
	mocks: StoryMocks<TControls>,
	config?: StoryOwnedConfig,
): StoryMocksMeta<TControls> => ({
	args: mocks.args,
	argTypes: mocks.argTypes,
	parameters: { signoz: { ...config, mocks } },
});
