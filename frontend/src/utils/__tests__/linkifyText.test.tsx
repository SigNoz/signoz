import { render, screen } from '@testing-library/react';

import { linkifyText } from '../linkifyText';

describe('linkifyText', () => {
	it('returns plain text unchanged when there are no links', () => {
		render(<div>{linkifyText('just a plain description')}</div>);

		expect(screen.getByText('just a plain description')).toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('wraps an http(s) URL in an anchor that opens in a new tab', () => {
		render(<div>{linkifyText('see https://signoz.io/docs for more')}</div>);

		const link = screen.getByRole('link', { name: 'https://signoz.io/docs' });
		expect(link).toHaveAttribute('href', 'https://signoz.io/docs');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('prefixes bare www. links with https://', () => {
		render(<div>{linkifyText('visit www.signoz.io')}</div>);

		const link = screen.getByRole('link', { name: 'www.signoz.io' });
		expect(link).toHaveAttribute('href', 'https://www.signoz.io');
	});

	it('keeps trailing punctuation outside the link', () => {
		render(<div>{linkifyText('read https://signoz.io.')}</div>);

		const link = screen.getByRole('link', { name: 'https://signoz.io' });
		expect(link).toHaveAttribute('href', 'https://signoz.io');
	});

	it('linkifies multiple URLs in the same string', () => {
		render(
			<div>{linkifyText('a https://one.com and b https://two.com end')}</div>,
		);

		expect(screen.getAllByRole('link')).toHaveLength(2);
		expect(
			screen.getByRole('link', { name: 'https://one.com' }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: 'https://two.com' }),
		).toBeInTheDocument();
	});

	it('preserves newlines around a link', () => {
		const { container } = render(
			<div>{linkifyText('line one\nsee https://signoz.io\nline three')}</div>,
		);

		expect(container.textContent).toBe(
			'line one\nsee https://signoz.io\nline three',
		);
		expect(
			screen.getByRole('link', { name: 'https://signoz.io' }),
		).toHaveAttribute('href', 'https://signoz.io');
	});

	it('returns an empty string unchanged', () => {
		expect(linkifyText('')).toBe('');
	});
});
