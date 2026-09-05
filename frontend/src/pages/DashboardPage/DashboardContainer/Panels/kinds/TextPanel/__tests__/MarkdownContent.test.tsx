import { render, screen, waitFor } from 'tests/test-utils';

import MarkdownContent from '../MarkdownContent';
import { loadLanguage } from '../syntaxLanguages';

describe('MarkdownContent', () => {
	describe('security', () => {
		it('renders a script tag as literal text, never as an element', () => {
			const { container } = render(
				<MarkdownContent>{'<script>alert(1)</script>'}</MarkdownContent>,
			);

			expect(container.querySelector('script')).toBeNull();
			expect(screen.getByTestId('markdown-content')).toHaveTextContent(
				'<script>alert(1)</script>',
			);
		});

		it('renders raw HTML as text rather than markup', () => {
			const { container } = render(
				<MarkdownContent>{'<b>bold</b> and <img src="x" onerror="alert(1)">'}</MarkdownContent>,
			);

			expect(container.querySelector('b')).toBeNull();
			expect(container.querySelector('img')).toBeNull();
			expect(screen.getByTestId('markdown-content')).toHaveTextContent(
				'<b>bold</b>',
			);
		});

		it('drops the anchor for a javascript: href, keeping the label as text', () => {
			const { container } = render(
				<MarkdownContent>{'[x](javascript:alert(1))'}</MarkdownContent>,
			);

			expect(screen.queryByRole('link')).not.toBeInTheDocument();
			expect(container.innerHTML).not.toContain('javascript');
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
			const { container } = render(
				<MarkdownContent>
					{'| a | b |\n| --- | --- |\n| 1 | 2 |\n\n- [x] done\n\n~~gone~~'}
				</MarkdownContent>,
			);

			expect(screen.getByRole('table')).toBeInTheDocument();
			expect(screen.getByRole('checkbox')).toBeChecked();
			expect(container.querySelector('del')).toHaveTextContent('gone');
		});

		it('renders fenced code as a preformatted block', () => {
			const { container } = render(
				<MarkdownContent>{'```sh\nkubectl get pods\n```'}</MarkdownContent>,
			);

			expect(container.querySelector('pre code')).toHaveTextContent(
				'kubectl get pods',
			);
			expect(container.querySelectorAll('pre')).toHaveLength(1);
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
			const { container } = render(
				<MarkdownContent>{'```js\nconst x = 1; // note\n```'}</MarkdownContent>,
			);

			await waitFor(() => {
				expect(container.querySelector('.token.keyword')).toHaveTextContent('const');
			});
			expect(container.querySelector('.token.number')).toHaveTextContent('1');
			expect(container.querySelector('.token.comment')).toHaveTextContent('// note');
		});

		it('shows the source verbatim while the language is still loading', () => {
			const { container } = render(
				<MarkdownContent>{'```rust\nfn main() {}\n```'}</MarkdownContent>,
			);

			expect(container.querySelector('pre code')).toHaveTextContent('fn main() {}');
			expect(container.querySelector('.token')).toBeNull();
		});

		it('highlights a language already loaded on the first render', async () => {
			await loadLanguage('sql');
			const { container } = render(
				<MarkdownContent>{'```sql\nSELECT 1\n```'}</MarkdownContent>,
			);

			expect(container.querySelector('.token.keyword')).toHaveTextContent('SELECT');
		});

		it('tags the code element with the language', () => {
			const { container } = render(
				<MarkdownContent>{'```python\nx = 1\n```'}</MarkdownContent>,
			);

			expect(container.querySelector('code')).toHaveClass('language-python');
		});

		it('renders an unknown language verbatim', () => {
			const { container } = render(
				<MarkdownContent>{'```promql\nrate(foo[5m])\n```'}</MarkdownContent>,
			);

			expect(container.querySelector('pre code')).toHaveTextContent('rate(foo[5m])');
			expect(container.querySelector('.token')).toBeNull();
		});

		it('renders a fence with no language verbatim', () => {
			const { container } = render(
				<MarkdownContent>{'```\nplain text\n```'}</MarkdownContent>,
			);

			expect(container.querySelector('pre code')).toHaveTextContent('plain text');
			expect(container.querySelector('.token')).toBeNull();
		});

		it('leaves inline code untokenised', () => {
			const { container } = render(
				<MarkdownContent>{'use `const` here'}</MarkdownContent>,
			);

			expect(container.querySelector('pre')).toBeNull();
			expect(container.querySelector('.token')).toBeNull();
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

		expect(
			screen.queryByTestId('text-panel-copy-code'),
		).not.toBeInTheDocument();
	});
});
