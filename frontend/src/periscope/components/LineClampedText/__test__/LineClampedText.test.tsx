import { render, screen } from '@testing-library/react';

import LineClampedText from '../LineClampedText';

describe('LineClampedText', () => {
	// Reset all mocks after each test
	afterEach(() => {
		jest.clearAllMocks();
	});

	it('renders string text correctly', () => {
		const text = 'Test text';
		render(<LineClampedText text={text} />);

		expect(screen.getByText(text)).toBeInTheDocument();
	});

	it('renders empty string correctly', () => {
		const { container } = render(<LineClampedText text="" />);

		// For empty strings, we need to check that a div exists
		// but it's harder to check for empty text directly with queries
		expect(container.textContent).toBe('');
	});

	it('renders boolean text correctly - true', () => {
		render(<LineClampedText text />);

		expect(screen.getByText('true')).toBeInTheDocument();
	});

	it('renders boolean text correctly - false', () => {
		render(<LineClampedText text={false} />);

		expect(screen.getByText('false')).toBeInTheDocument();
	});

	it('applies line clamping with provided lines prop', () => {
		const text = 'Test text with multiple lines';
		const lines = 2;

		render(<LineClampedText text={text} lines={lines} />);

		// Verify the text is rendered correctly
		expect(screen.getByText(text)).toBeInTheDocument();

		// Verify the component received the correct props
		expect((screen.getByText(text).style as any).WebkitLineClamp).toBe(
			String(lines),
		);
	});

	it('uses default line count of 1 when lines prop is not provided', () => {
		const text = 'Test text';

		render(<LineClampedText text={text} />);

		// Verify the text is rendered correctly
		expect(screen.getByText(text)).toBeInTheDocument();

		// Verify the default props
		expect(LineClampedText.defaultProps?.lines).toBe(1);
	});
});
