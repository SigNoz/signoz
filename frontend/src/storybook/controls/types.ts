import type { ArgTypes } from '@storybook/react-vite';
import type { RequestHandler } from 'msw';

import type { MockResponse } from '../msw/types';
import type { ResponseState } from '../runtime/responseState';
import type { StoryOwnedConfig, StoryRole } from '../types';

export type ControlDescriptor = ArgTypes[string];

/** One row of the Storybook controls panel plus the value it starts at. */
export interface MockControl<TValue> {
	defaultValue: TValue;
	argType: ControlDescriptor;
}

export type MockControlMap = Record<string, MockControl<unknown>>;

export type MockControlValues<TControls extends MockControlMap> = {
	[TName in keyof TControls]: TControls[TName] extends MockControl<infer TValue>
		? TValue
		: never;
};

/**
 * What a mock module contributes to the story it runs in. Only `controls` is
 * required; the rest are the ways a control can reach the page.
 */
export interface StoryMocksDefinition<TControls extends MockControlMap> {
	controls: TControls;
	handlers?(
		values: MockControlValues<TControls>,
		response: MockResponse,
	): RequestHandler[];
	/** Provider-level knobs no endpoint covers. */
	config?(values: MockControlValues<TControls>): Partial<StoryOwnedConfig>;
	/** Seeds module-level app state no provider exposes, e.g. no-auth mode. */
	effect?(values: MockControlValues<TControls>): void;
	/**
	 * How the endpoints declared through `response` answer. The first module that
	 * answers decides, page modules ahead of the global ones.
	 */
	responseState?(values: MockControlValues<TControls>): ResponseState;
	/**
	 * The legacy role the story runs as. Derived, never set by a story. See
	 * `authzMocks`, which derives it from the permissions it grants.
	 */
	role?(values: MockControlValues<TControls>): StoryRole;
}

export interface StoryMocks<
	TControls extends MockControlMap,
> extends StoryMocksDefinition<TControls> {
	args: MockControlValues<TControls>;
	argTypes: Record<string, ControlDescriptor>;
	read(args: Record<string, unknown>): MockControlValues<TControls>;
}

export type AnyStoryMocks = StoryMocks<MockControlMap>;

export type StoryMockArgs<TMocks extends AnyStoryMocks> =
	TMocks extends StoryMocks<infer TControls>
		? MockControlValues<TControls>
		: never;
