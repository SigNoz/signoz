import { useGetAlerts } from 'api/generated/services/alerts';
import { render } from 'tests/test-utils';

import StripInfo from '../StripInfo';

jest.mock('api/generated/services/alerts', () => ({
	useGetAlerts: jest.fn(),
}));

const mockUseGetAlerts = useGetAlerts as jest.Mock;

describe('StripInfo', () => {
	it('counts the firing alert instances', () => {
		mockUseGetAlerts.mockReturnValue({ data: { data: [{}, {}, {}] } });

		const { getByText } = render(<StripInfo />);

		expect(getByText('3 alerts firing')).toBeInTheDocument();
	});

	it('says alert, not alerts, when only one is firing', () => {
		mockUseGetAlerts.mockReturnValue({ data: { data: [{}] } });

		const { getByText } = render(<StripInfo />);

		expect(getByText('1 alert firing')).toBeInTheDocument();
	});

	it('shows zero before the response lands', () => {
		mockUseGetAlerts.mockReturnValue({ data: undefined });

		const { getByText } = render(<StripInfo />);

		expect(getByText('0 alerts firing')).toBeInTheDocument();
	});
});
