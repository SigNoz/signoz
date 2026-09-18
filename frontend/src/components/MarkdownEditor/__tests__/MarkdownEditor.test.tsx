import { useCallback, useRef, useState } from 'react';
import { EditorView } from '@uiw/react-codemirror';
import { mockCodeMirrorDomApis } from 'components/QueryBuilderV2/QueryV2/__tests__/codemirrorDomMocks';
import {
	act,
	fireEvent,
	render,
	screen,
	userEvent,
	waitFor,
} from 'tests/test-utils';

import MarkdownEditor from '../MarkdownEditor';
import type { EditorVariable } from '../types';

beforeAll(() => {
	mockCodeMirrorDomApis();
});

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => true,
}));

const VARIABLES: EditorVariable[] = [
	{ name: 'environment', badge: 'QUERY' },
	{ name: 'service', badge: 'CUSTOM' },
];

/** A caller whose state trails the editor by one keystroke. */
function LaggingHarness(): JSX.Element {
	const [value, setValue] = useState('');
	const previousRef = useRef('');
	const onChange = useCallback((next: string): void => {
		setValue(previousRef.current);
		previousRef.current = next;
	}, []);

	return <MarkdownEditor value={value} onChange={onChange} />;
}

/** Pushes a replacement in from outside the editor. */
function ExternalHarness(): JSX.Element {
	const [value, setValue] = useState('before');

	return (
		<>
			<button type="button" onClick={(): void => setValue('after')}>
				push
			</button>
			<MarkdownEditor value={value} onChange={setValue} />
		</>
	);
}

function Harness({
	initialValue = '',
	maxLength,
	variables = VARIABLES,
}: {
	initialValue?: string;
	maxLength?: number;
	variables?: EditorVariable[];
}): JSX.Element {
	const [value, setValue] = useState(initialValue);
	return (
		<MarkdownEditor
			value={value}
			onChange={setValue}
			variables={variables}
			maxLength={maxLength}
			statusHint="Preview updates as you type"
		/>
	);
}

const getView = (): EditorView => {
	const dom = document.querySelector('.cm-editor');
	const view = dom ? EditorView.findFromDOM(dom as HTMLElement) : null;
	if (!view) {
		throw new Error('editor view not mounted');
	}
	return view;
};

const select = (from: number, to: number): void => {
	act(() => {
		getView().dispatch({ selection: { anchor: from, head: to } });
	});
};

const documentText = (): string => getView().state.doc.toString();

describe('MarkdownEditor', () => {
	it('reports the caret position and character count', async () => {
		render(<Harness initialValue={'one\ntwo'} />);

		select(5, 5);

		await waitFor(() => {
			expect(screen.getByTestId('markdown-editor-status')).toHaveTextContent(
				'Ln 2, Col 2',
			);
		});
		expect(screen.getByTestId('markdown-editor-char-count')).toHaveTextContent(
			'7 chars',
		);
	});

	it('flags a body over the character cap', async () => {
		render(<Harness initialValue="123456" maxLength={5} />);

		await waitFor(() => {
			expect(screen.getByTestId('markdown-editor-char-count')).toHaveTextContent(
				'6 / 5 chars',
			);
		});
	});

	it('applies a toolbar command to the selection', async () => {
		render(<Harness initialValue="a word b" />);

		select(2, 6);
		await userEvent.click(screen.getByTestId('markdown-command-bold'));

		await waitFor(() => {
			expect(documentText()).toBe('a **word** b');
		});
	});

	it('inserts a variable token at the caret', async () => {
		render(<Harness initialValue="env: " />);

		select(5, 5);
		await userEvent.click(screen.getByTestId('markdown-insert-variable'));

		// The row shows the name and kind badge.
		const row = await screen.findByTestId('markdown-variable-environment');
		expect(row).toHaveTextContent('$environment');
		expect(row).toHaveTextContent('QUERY');

		// fireEvent: userEvent's pointer-down path walks DOM selection APIs the
		// CodeMirror mocks stub out.
		fireEvent.click(row);

		await waitFor(() => {
			expect(documentText()).toBe('env: $environment');
		});
	});

	it('colours Markdown syntax and variable tokens in the source', async () => {
		render(<Harness initialValue={'## Runbook\nowner {{team}}'} />);

		await waitFor(() => {
			expect(document.querySelector('.cm-md-heading')).toBeInTheDocument();
		});
		expect(document.querySelector('.cm-md-variable')).toHaveTextContent(
			'{{team}}',
		);
	});

	describe('uncontrolled document', () => {
		const type = (at: number, text: string): void => {
			act(() => {
				getView().dispatch({
					changes: { from: at, insert: text },
					selection: { anchor: at + text.length },
				});
			});
		};

		const focusEditor = (): void => {
			act(() => {
				getView().focus();
			});
		};

		it('keeps the document and caret while the caller lags behind the typing', () => {
			render(<LaggingHarness />);
			focusEditor();

			type(0, 'a');
			type(1, 'b');
			type(2, 'c');

			expect(documentText()).toBe('abc');
			expect(getView().state.selection.main.head).toBe(3);
		});

		it('reports every keystroke to the caller', () => {
			const onChange = jest.fn();
			render(<MarkdownEditor value="ab" onChange={onChange} />);

			type(2, 'c');

			expect(onChange).toHaveBeenLastCalledWith('abc');
		});

		it('does not report the seed back as a change', () => {
			const onChange = jest.fn();
			render(<MarkdownEditor value="seeded" onChange={onChange} />);

			expect(documentText()).toBe('seeded');
			expect(onChange).not.toHaveBeenCalled();
		});

		it('applies an external replacement while the editor is unfocused', async () => {
			render(<ExternalHarness />);

			await userEvent.click(screen.getByRole('button', { name: 'push' }));

			expect(documentText()).toBe('after');
		});

		it('ignores a replacement that arrives while the author is still typing', () => {
			render(<ExternalHarness />);
			focusEditor();

			// fireEvent: a real click would blur the editor first. This covers an update
			// arriving on its own, while the author is still in the document.
			fireEvent.click(screen.getByRole('button', { name: 'push' }));

			expect(documentText()).toBe('before');
		});

		it('counts characters from the document, not from the lagging value', async () => {
			render(<MarkdownEditor value="ab" onChange={jest.fn()} />);

			type(2, 'cde');

			await waitFor(() => {
				expect(screen.getByTestId('markdown-editor-char-count')).toHaveTextContent(
					'5 chars',
				);
			});
		});
	});

	it('offers both list kinds in the toolbar', () => {
		render(<Harness />);

		expect(
			screen.getByTestId('markdown-command-bulleted-list'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('markdown-command-numbered-list'),
		).toBeInTheDocument();
	});

	it('disables authoring affordances when read-only', () => {
		render(
			<MarkdownEditor
				value="body"
				onChange={jest.fn()}
				variables={VARIABLES}
				readOnly
			/>,
		);

		expect(screen.getByTestId('markdown-command-bold')).toBeDisabled();
		expect(screen.getByTestId('markdown-insert-variable')).toBeDisabled();
	});

	it('hides the insert-variable control when none are available', () => {
		render(<Harness variables={[]} />);

		expect(
			screen.queryByTestId('markdown-insert-variable'),
		).not.toBeInTheDocument();
	});
});
