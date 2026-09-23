import { render } from 'tests/test-utils';

import StripInfo from '../StripInfo';

describe('StripInfo', () => {
	it('shows the span and error counts', () => {
		const { getByText } = render(
			<StripInfo totalSpansCount={600} totalErrorSpansCount={4} />,
		);

		expect(getByText('Spans: 600')).toBeInTheDocument();
		expect(getByText('Errors: 4')).toBeInTheDocument();
	});

	it('shows zero counts rather than hiding them', () => {
		const { getByText } = render(
			<StripInfo totalSpansCount={0} totalErrorSpansCount={0} />,
		);

		expect(getByText('Spans: 0')).toBeInTheDocument();
		expect(getByText('Errors: 0')).toBeInTheDocument();
	});
});
