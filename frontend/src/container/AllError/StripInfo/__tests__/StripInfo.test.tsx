import { render } from 'tests/test-utils';

import StripInfo from '../StripInfo';

describe('StripInfo', () => {
	it('shows how many exceptions matched', () => {
		const { getByText } = render(<StripInfo count={42} />);

		expect(getByText('42 exceptions')).toBeInTheDocument();
	});

	it('says exception, not exceptions, when there is one', () => {
		const { getByText } = render(<StripInfo count={1} />);

		expect(getByText('1 exception')).toBeInTheDocument();
	});

	it('shows zero when nothing matched', () => {
		const { getByText } = render(<StripInfo count={0} />);

		expect(getByText('0 exceptions')).toBeInTheDocument();
	});
});
