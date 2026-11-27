import { EditorView } from '@uiw/react-codemirror';
import { DASHBOARDS_DSL_GRAMMAR } from 'pages/DashboardsListPage/list.config';
import { render, screen, userEvent } from 'tests/test-utils';

import SearchBar from '../SearchBar';

const TEST_ID = 'list-search';

function getView(): EditorView {
	const view = EditorView.findFromDOM(screen.getByTestId(TEST_ID));
	if (!view) {
		throw new Error('Search editor not found');
	}
	return view;
}

describe('SearchBar', () => {
	it('leaves Mod-f to the browser instead of opening the editor find panel', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		render(
			<SearchBar
				value="name = 'api'"
				grammar={DASHBOARDS_DSL_GRAMMAR}
				testIdPrefix={TEST_ID}
				onChange={jest.fn()}
				onSubmit={jest.fn()}
			/>,
		);

		const view = getView();
		await user.click(view.contentDOM);
		await user.keyboard('{Control>}f{/Control}');

		expect(view.dom.querySelector('.cm-search')).toBeNull();
	});
});
