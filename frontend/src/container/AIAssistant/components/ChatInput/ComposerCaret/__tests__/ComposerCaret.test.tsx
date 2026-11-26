import { useRef, useState } from 'react';
import { fireEvent, render, screen, userEvent } from 'tests/test-utils';
import { getCaretCoordinates } from 'utils/getCaretCoordinates';

import ComposerCaret from '../ComposerCaret';

jest.mock('utils/getCaretCoordinates');

const CHAR_WIDTH = 8;

function Composer(): JSX.Element {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [value, setValue] = useState('');
	return (
		<>
			<textarea
				ref={textareaRef}
				data-testid="composer"
				value={value}
				onChange={(event): void => setValue(event.target.value)}
				onKeyDown={(event): void => {
					if (event.key === 'Enter') {
						event.preventDefault();
						setValue('');
					}
				}}
			/>
			<button type="button" data-testid="elsewhere">
				Elsewhere
			</button>
			<ComposerCaret textareaRef={textareaRef} value={value} />
		</>
	);
}

describe('ComposerCaret', () => {
	beforeEach(() => {
		// jsdom has no layout; the caret only shows inside the textarea's visible height.
		jest
			.spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
			.mockImplementation(function offsetHeight(this: HTMLElement) {
				return this instanceof HTMLTextAreaElement ? 40 : 0;
			});
		// One line of fixed-width text, so the caret's left tracks its index.
		jest.mocked(getCaretCoordinates).mockImplementation((_, position) => ({
			left: position * CHAR_WIDTH,
			top: 0,
			height: 16,
		}));
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('draws its caret while the composer has focus', async () => {
		const user = userEvent.setup();
		render(<Composer />);

		await user.click(screen.getByTestId('composer'));

		expect(screen.getByTestId('ai-composer-caret')).toBeInTheDocument();
	});

	it('hides its caret once the composer loses focus', async () => {
		const user = userEvent.setup();
		render(<Composer />);
		await user.click(screen.getByTestId('composer'));

		await user.click(screen.getByTestId('elsewhere'));

		expect(screen.queryByTestId('ai-composer-caret')).not.toBeInTheDocument();
	});

	it('hides its caret while text is selected', async () => {
		const user = userEvent.setup();
		render(<Composer />);
		const composer = screen.getByTestId<HTMLTextAreaElement>('composer');
		await user.type(composer, 'checkout latency');

		composer.setSelectionRange(0, 8);
		// jsdom fires no selectionchange for setSelectionRange.
		fireEvent(document, new Event('selectionchange'));

		expect(screen.queryByTestId('ai-composer-caret')).not.toBeInTheDocument();
	});

	it('moves its caret when code changes the text', async () => {
		const user = userEvent.setup();
		render(<Composer />);
		await user.type(screen.getByTestId('composer'), 'checkout');
		expect(screen.getByTestId('ai-composer-caret')).toHaveStyle({
			transform: `translate(${8 * CHAR_WIDTH}px, 0px)`,
		});

		await user.keyboard('{Enter}');

		expect(screen.getByTestId('ai-composer-caret')).toHaveStyle({
			transform: 'translate(0px, 0px)',
		});
	});

	it('hides its caret once the composer scrolls it out of view', async () => {
		const user = userEvent.setup();
		render(<Composer />);
		const composer = screen.getByTestId<HTMLTextAreaElement>('composer');
		await user.type(composer, 'checkout latency');

		composer.scrollTop = 30;
		fireEvent.scroll(composer);

		expect(screen.queryByTestId('ai-composer-caret')).not.toBeInTheDocument();
	});
});
