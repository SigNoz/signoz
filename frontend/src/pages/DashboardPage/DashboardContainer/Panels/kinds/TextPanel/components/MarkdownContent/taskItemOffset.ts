import {
	// eslint-disable-next-line no-restricted-imports
	createContext,
	// eslint-disable-next-line no-restricted-imports
	useContext,
} from 'react';

/**
 * Offset of the enclosing list item in the rendered body. The checkbox a task list
 * renders is synthesised by the AST transform with no position of its own, so its
 * item supplies one — after every earlier marker and before its own, which is all
 * the ordinal needs.
 *
 * Context, not a store: one render pass handing a node's position to its child.
 */
export const TaskItemOffsetContext = createContext<number | undefined>(
	undefined,
);

export function useTaskItemOffset(): number | undefined {
	return useContext(TaskItemOffsetContext);
}
