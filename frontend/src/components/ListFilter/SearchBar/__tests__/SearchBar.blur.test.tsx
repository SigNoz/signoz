import type { ComponentProps } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

import type { DslGrammar } from '../../dsl/types';
import SearchBar from '../SearchBar';

type SearchBarProps = ComponentProps<typeof SearchBar>;

const GRAMMAR: DslGrammar = {
	fields: [{ key: 'name', type: 'string' }],
	dynamicKey: { detail: 'tag', prefix: '' },
};

function renderSearchBar(props: { dirty: boolean; disabled?: boolean }): {
	onSubmit: jest.MockedFunction<SearchBarProps['onSubmit']>;
	onSubmitted: jest.MockedFunction<NonNullable<SearchBarProps['onSubmitted']>>;
} {
	const onSubmit = jest.fn() as jest.MockedFunction<SearchBarProps['onSubmit']>;
	const onSubmitted = jest.fn() as jest.MockedFunction<
		NonNullable<SearchBarProps['onSubmitted']>
	>;
	render(
		<>
			<SearchBar
				value="name = 'x'"
				grammar={GRAMMAR}
				testIdPrefix="list-search"
				onChange={jest.fn()}
				onSubmit={onSubmit}
				onSubmitted={onSubmitted}
				dirty={props.dirty}
				disabled={props.disabled}
			/>
			<button type="button" data-testid="outside">
				outside
			</button>
		</>,
	);
	return { onSubmit, onSubmitted };
}

function searchContent(): HTMLElement {
	return screen
		.getByTestId('list-search')
		.querySelector('.cm-content') as HTMLElement;
}

describe('SearchBar — run on blur', () => {
	let hasFocus: jest.SpyInstance<boolean, []>;

	beforeEach(() => {
		// jsdom reports no focus once it leaves the editor; a focused browser window does.
		hasFocus = jest.spyOn(document, 'hasFocus').mockReturnValue(true);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('runs an unrun draft when focus leaves the box', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const { onSubmit, onSubmitted } = renderSearchBar({ dirty: true });

		await user.click(searchContent());
		await user.click(screen.getByTestId('outside'));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmitted).toHaveBeenCalledWith(true);
	});

	it('does nothing when the draft was already run', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const { onSubmit } = renderSearchBar({ dirty: false });

		await user.click(searchContent());
		await user.click(screen.getByTestId('outside'));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does nothing when focus leaves the window', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const { onSubmit } = renderSearchBar({ dirty: true });

		await user.click(searchContent());
		hasFocus.mockReturnValue(false);
		await user.click(screen.getByTestId('outside'));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('runs once when Run query is clicked with an unrun draft', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const { onSubmit } = renderSearchBar({ dirty: true });

		await user.click(searchContent());
		await user.click(screen.getByTestId('list-search-submit'));

		expect(onSubmit).toHaveBeenCalledTimes(1);
	});
});
