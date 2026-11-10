import type { AnyStoryMocks, ControlDescriptor, StoryMockArgs } from './types';

type UnionToIntersection<TUnion> = (
	TUnion extends unknown ? (arg: TUnion) => void : never
) extends (arg: infer TIntersection) => void
	? TIntersection
	: never;

/** The args of every mock module in a list, as one object type. */
export type ComposedMockArgs<TMocks extends readonly AnyStoryMocks[]> =
	UnionToIntersection<StoryMockArgs<TMocks[number]>>;

export interface ComposedStoryMocks<TMocks extends readonly AnyStoryMocks[]> {
	/** In resolution order: the first module to answer a question wins. */
	members: TMocks;
	args: ComposedMockArgs<TMocks>;
	argTypes: Record<string, ControlDescriptor>;
}

/**
 * One registration point for a set of mock modules: the panel rows they publish
 * and the args type a story is checked against are both derived from the list,
 * so adding a module is a single edit.
 */
export const composeStoryMocks = <TMocks extends readonly AnyStoryMocks[]>(
	...members: TMocks
): ComposedStoryMocks<TMocks> => ({
	members,
	args: Object.assign(
		{},
		...members.map((mocks) => mocks.args),
	) as ComposedMockArgs<TMocks>,
	argTypes: Object.assign({}, ...members.map((mocks) => mocks.argTypes)),
});
