import { render } from 'tests/test-utils';

import StripKeyValue from '../StripKeyValue';

describe('StripKeyValue', () => {
	it('renders the label and the value around a colon it owns', () => {
		const { getByText, container } = render(
			<StripKeyValue label="Spans" value={31} />,
		);

		expect(getByText('Spans')).toBeInTheDocument();
		expect(getByText('31')).toBeInTheDocument();
		// The consumer never builds the string, so the spacing cannot drift.
		expect(container.textContent).toBe('Spans:31');
	});

	it('tints only the icon when the tone is set', () => {
		const { container } = render(
			<StripKeyValue
				label="Errors"
				value={4}
				tone="error"
				prefix={<svg data-testid="icon" />}
			/>,
		);

		// The tone lands on the icon, never on the text.
		expect(container.querySelector('[data-tone]')).toHaveAttribute(
			'data-tone',
			'error',
		);
	});

	it('leaves the icon untinted by default', () => {
		const { container } = render(
			<StripKeyValue label="Errors" value={0} prefix={<svg />} />,
		);

		expect(container.querySelector('[data-tone]')).toHaveAttribute(
			'data-tone',
			'default',
		);
	});
});
