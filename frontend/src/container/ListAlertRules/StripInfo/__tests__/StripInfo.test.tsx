import { render } from 'tests/test-utils';

import StripInfo from '../StripInfo';

describe('StripInfo', () => {
	it('shows how many rules the filters left', () => {
		const { getByText } = render(<StripInfo filteredCount={3} totalCount={12} />);

		expect(getByText('3 of 12 rules')).toBeInTheDocument();
	});

	it('says rule, not rules, when there is only one', () => {
		const { getByText } = render(<StripInfo filteredCount={1} totalCount={1} />);

		expect(getByText('1 of 1 rule')).toBeInTheDocument();
	});

	it('shows zero when the filters match nothing', () => {
		const { getByText } = render(<StripInfo filteredCount={0} totalCount={12} />);

		expect(getByText('0 of 12 rules')).toBeInTheDocument();
	});
});
