import { type EditableConstruct, matchOffsets } from './markdownSource';

/** Group 1 runs up to the state character, which is the span a toggle rewrites. */
const TASK_MARKER = /^([ \t]*(?:[-*+]|\d+[.)])[ \t]+\[)[ xX](\])/gm;

/** The checkbox a GFM task list renders. */
export const TASK_LIST: EditableConstruct<boolean> = {
	offsets: (markdown) =>
		matchOffsets(markdown, TASK_MARKER, (match) => match[1].length),
	rewrite: (markdown, offset, checked) =>
		markdown.slice(0, offset) +
		(checked ? 'x' : ' ') +
		markdown.slice(offset + 1),
};
