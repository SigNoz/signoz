import { render } from 'tests/test-utils';

import StripInfo from '../StripInfo';

describe('StripInfo', () => {
	it('shows how many services are listed', () => {
		const { getByText } = render(<StripInfo count={18} />);

		expect(getByText('18 services')).toBeInTheDocument();
	});

	it('says service, not services, when there is one', () => {
		const { getByText } = render(<StripInfo count={1} />);

		expect(getByText('1 service')).toBeInTheDocument();
	});

	it('shows zero when there are none', () => {
		const { getByText } = render(<StripInfo count={0} />);

		expect(getByText('0 services')).toBeInTheDocument();
	});
});
