import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor, within } from 'tests/test-utils';

import MarkdownContent from '../components/MarkdownContent/MarkdownContent';
import { loadLanguage } from '../../../utils/syntaxLanguages';

describe('MarkdownContent', () => {
	describe('security', () => {
		it('renders a script tag as literal text, never as an element', () => {
			render(<MarkdownContent>{'<script>alert(1)</script>'}</MarkdownContent>);

			const content = screen.getByTestId('markdown-content');
			expect(content.innerHTML).not.toContain('<script');
			expect(content).toHaveTextContent('<script>alert(1)</script>');
		});

		it('renders raw HTML as text rather than markup', () => {
			render(
				<MarkdownContent>
					{'<b>bold</b> and <img src="x" onerror="alert(1)">'}
				</MarkdownContent>,
			);

			const content = screen.getByTestId('markdown-content');
			expect(content.innerHTML).not.toContain('<b>');
			expect(content.innerHTML).not.toContain('<img');
			expect(content).toHaveTextContent('<b>bold</b>');
		});

		it('drops the anchor for a javascript: href, keeping the label as text', () => {
			render(<MarkdownContent>{'[x](javascript:alert(1))'}</MarkdownContent>);

			expect(screen.queryByRole('link')).not.toBeInTheDocument();
			expect(screen.getByTestId('markdown-content').innerHTML).not.toContain(
				'javascript',
			);
			expect(screen.getByTestId('markdown-content')).toHaveTextContent('x');
		});

		it('opens links in a new tab without handing over the opener', () => {
			render(<MarkdownContent>{'[docs](https://signoz.io)'}</MarkdownContent>);

			const link = screen.getByRole('link', { name: 'docs' });
			expect(link).toHaveAttribute('href', 'https://signoz.io');
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer nofollow');
		});
	});

	describe('CommonMark and GFM', () => {
		it('renders headings, lists and emphasis', () => {
			render(
				<MarkdownContent>
					{'# Runbook\n\n- **owner** payments\n- _rotation_ weekly'}
				</MarkdownContent>,
			);

			expect(
				screen.getByRole('heading', { level: 1, name: 'Runbook' }),
			).toBeInTheDocument();
			expect(screen.getAllByRole('listitem')).toHaveLength(2);
			expect(screen.getByText('owner').tagName).toBe('STRONG');
			expect(screen.getByText('rotation').tagName).toBe('EM');
		});

		it('renders GFM tables, task lists and strikethrough', () => {
			render(
				<MarkdownContent>
					{'| a | b |\n| --- | --- |\n| 1 | 2 |\n\n- [x] done\n\n~~gone~~'}
				</MarkdownContent>,
			);

			expect(screen.getByRole('table')).toBeInTheDocument();
			expect(screen.getByRole('checkbox')).toBeChecked();
			expect(screen.getByText('gone').tagName).toBe('DEL');
		});

		it('renders fenced code as a preformatted block', () => {
			render(<MarkdownContent>{'```sh\nkubectl get pods\n```'}</MarkdownContent>);

			expect(
				within(screen.getByTestId('text-panel-code-block')).getByRole('code'),
			).toHaveTextContent('kubectl get pods');
			expect(
				// oxlint-disable-next-line signoz/no-dom-node-access -- counts pre elements: react-markdown nests its own pre around CodeBlock's unless MarkdownContent drops it
				screen.getByTestId('markdown-content').querySelectorAll('pre'),
			).toHaveLength(1);
		});

		it('renders malformed markdown as literal text instead of throwing', () => {
			render(<MarkdownContent>{'| broken | table\n**unclosed'}</MarkdownContent>);

			expect(screen.getByTestId('markdown-content')).toHaveTextContent(
				'**unclosed',
			);
		});
	});

	describe('syntax highlighting', () => {
		it('tokenises a fenced block once its language has loaded', async () => {
			render(
				<MarkdownContent>{'```js\nconst x = 1; // note\n```'}</MarkdownContent>,
			);

			await waitFor(() => {
				expect(screen.getByText('const')).toHaveClass('token', 'keyword');
			});
			expect(screen.getByText('1')).toHaveClass('token', 'number');
			expect(screen.getByText('// note')).toHaveClass('token', 'comment');
		});

		it('shows the source verbatim while the language is still loading', () => {
			render(<MarkdownContent>{'```rust\nfn main() {}\n```'}</MarkdownContent>);

			expect(
				screen.getByText('fn main() {}', { selector: 'code' }),
			).toBeInTheDocument();
		});

		it('highlights a language already loaded on the first render', async () => {
			await loadLanguage('sql');
			render(<MarkdownContent>{'```sql\nSELECT 1\n```'}</MarkdownContent>);

			expect(screen.getByText('SELECT')).toHaveClass('token', 'keyword');
		});

		it('tags the code element with the language', () => {
			render(<MarkdownContent>{'```python\nx = 1\n```'}</MarkdownContent>);

			expect(screen.getByRole('code')).toHaveClass('language-python');
		});

		it('renders an unknown language verbatim', () => {
			render(<MarkdownContent>{'```promql\nrate(foo[5m])\n```'}</MarkdownContent>);

			expect(
				screen.getByText('rate(foo[5m])', { selector: 'code' }),
			).toBeInTheDocument();
		});

		it('renders a fence with no language verbatim', () => {
			render(<MarkdownContent>{'```\nplain text\n```'}</MarkdownContent>);

			expect(
				screen.getByText('plain text', { selector: 'code' }),
			).toBeInTheDocument();
		});

		it('leaves inline code untokenised', () => {
			render(<MarkdownContent>{'use `const` here'}</MarkdownContent>);

			expect(
				screen.queryByTestId('text-panel-code-block'),
			).not.toBeInTheDocument();
			expect(screen.getByText('const', { selector: 'code' })).toBeInTheDocument();
		});
	});

	describe('empty body', () => {
		it('renders nothing when the source is blank', () => {
			const { container } = render(<MarkdownContent>{'   \n  '}</MarkdownContent>);

			expect(container).toBeEmptyDOMElement();
		});

		it('renders the empty state when one is supplied', () => {
			render(
				<MarkdownContent emptyState={<span>Nothing here yet</span>}>
					{''}
				</MarkdownContent>,
			);

			expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
			expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
		});
	});
});

describe('code block copy button', () => {
	it('offers the block source, exactly as fenced, to the copy control', () => {
		render(<MarkdownContent>{'```sh\nkubectl get pods\n```'}</MarkdownContent>);

		const button = screen.getByTestId('text-panel-copy-code');
		expect(button).toHaveAccessibleName('Copy code');
	});

	it('renders no copy control on inline code', () => {
		render(<MarkdownContent>{'run `npm i` now'}</MarkdownContent>);

		expect(screen.queryByTestId('text-panel-copy-code')).not.toBeInTheDocument();
	});
});

describe('MarkdownContent — interactive task lists', () => {
	const source = ['- [ ] first', '- [x] second'].join('\n');

	it('renders task checkboxes disabled without the capability', () => {
		render(<MarkdownContent>{source}</MarkdownContent>);

		const boxes = screen.getAllByRole('checkbox');
		expect(boxes).toHaveLength(2);
		boxes.forEach((box) => expect(box).toBeDisabled());
	});

	it('renders them enabled, and checked to match the source', () => {
		render(
			<MarkdownContent interactive={{ source, onChangeSource: jest.fn() }}>
				{source}
			</MarkdownContent>,
		);

		const [first, second] = screen.getAllByRole('checkbox');
		expect(first).toBeEnabled();
		expect(first).not.toBeChecked();
		expect(second).toBeChecked();
	});

	it('warns on hover that a tick edits the panel', async () => {
		const user = userEvent.setup();
		render(
			<MarkdownContent interactive={{ source, onChangeSource: jest.fn() }}>
				{source}
			</MarkdownContent>,
		);

		await user.hover(screen.getAllByRole('checkbox')[0]);

		await waitFor(() => {
			expect(screen.getByRole('tooltip')).toHaveTextContent(
				'Toggling this updates the panel spec',
			);
		});
	});

	it('checking one rewrites its marker in the source', () => {
		const onChangeSource = jest.fn();
		render(
			<MarkdownContent interactive={{ source, onChangeSource }}>
				{source}
			</MarkdownContent>,
		);

		fireEvent.click(screen.getAllByRole('checkbox')[0]);

		expect(onChangeSource).toHaveBeenCalledWith(
			['- [x] first', '- [x] second'].join('\n'),
		);
	});

	it('unchecking one rewrites only that marker', () => {
		const onChangeSource = jest.fn();
		render(
			<MarkdownContent interactive={{ source, onChangeSource }}>
				{source}
			</MarkdownContent>,
		);

		fireEvent.click(screen.getAllByRole('checkbox')[1]);

		expect(onChangeSource).toHaveBeenCalledWith(
			['- [ ] first', '- [ ] second'].join('\n'),
		);
	});

	it('maps a click back through an expanded variable', () => {
		const onChangeSource = jest.fn();
		const withVariable = ['- [ ] $env first', '- [ ] second'].join('\n');
		render(
			<MarkdownContent interactive={{ source: withVariable, onChangeSource }}>
				{['- [ ] production first', '- [ ] second'].join('\n')}
			</MarkdownContent>,
		);

		fireEvent.click(screen.getAllByRole('checkbox')[1]);

		expect(onChangeSource).toHaveBeenCalledWith(
			['- [ ] $env first', '- [x] second'].join('\n'),
		);
	});

	it('saves nothing when a variable injected a marker of its own', () => {
		const onChangeSource = jest.fn();
		render(
			<MarkdownContent interactive={{ source: '- [ ] $tasks', onChangeSource }}>
				{['- [ ] one', '- [ ] two'].join('\n')}
			</MarkdownContent>,
		);

		fireEvent.click(screen.getAllByRole('checkbox')[0]);

		expect(onChangeSource).not.toHaveBeenCalled();
	});

	it('ignores a task marker inside a fence', () => {
		const onChangeSource = jest.fn();
		const fenced = ['```', '- [ ] fenced', '```', '', '- [ ] real'].join('\n');
		render(
			<MarkdownContent interactive={{ source: fenced, onChangeSource }}>
				{fenced}
			</MarkdownContent>,
		);

		expect(screen.getAllByRole('checkbox')).toHaveLength(1);

		fireEvent.click(screen.getByRole('checkbox'));

		expect(onChangeSource).toHaveBeenCalledWith(
			fenced.replace('- [ ] real', '- [x] real'),
		);
	});
});
