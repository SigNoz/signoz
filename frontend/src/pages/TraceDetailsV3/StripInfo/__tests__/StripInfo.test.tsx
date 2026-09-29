import { render } from 'tests/test-utils';

import StripInfo from '../StripInfo';

describe('StripInfo', () => {
	it('shows the span and error counts', () => {
		const { getByText } = render(
			<StripInfo totalSpansCount={600} totalErrorSpansCount={4} />,
		);

		expect(getByText('Spans')).toBeInTheDocument();
		expect(getByText('600')).toBeInTheDocument();
		expect(getByText('Errors')).toBeInTheDocument();
		expect(getByText('4')).toBeInTheDocument();
	});

	it('shows zero counts rather than hiding them', () => {
		const { getByText, getAllByText } = render(
			<StripInfo totalSpansCount={0} totalErrorSpansCount={0} />,
		);

		expect(getByText('Spans')).toBeInTheDocument();
		expect(getAllByText('0')).toHaveLength(2);
	});
});
