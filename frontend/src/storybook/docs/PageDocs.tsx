import {
	Controls,
	Description,
	Subtitle,
	Title,
} from '@storybook/addon-docs/blocks';

import StoryStates from './StoryStates';

/**
 * The docs page every page story gets, in place of Storybook's default: what the
 * page is, its controls, and its states as links.
 *
 * No canvas. A page story is the whole app behind msw, so the default template's
 * canvas per story is one app boot per story, and a story rendered on a docs page
 * re-registers the worker's handlers after the docs entry has already replaced
 * them, which leaves the page fetching against the global set.
 */
function PageDocs(): JSX.Element {
	return (
		<>
			<Title />
			<Subtitle />
			<Description />
			<Controls />
			<StoryStates />
		</>
	);
}

export default PageDocs;
