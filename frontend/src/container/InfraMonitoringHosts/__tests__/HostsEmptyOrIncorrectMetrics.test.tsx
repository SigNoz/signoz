import { render, screen } from '@testing-library/react';

import HostsEmptyOrIncorrectMetrics from '../HostsEmptyOrIncorrectMetrics';

describe('HostsEmptyOrIncorrectMetrics', () => {
	it('shows no data message when noData is true', () => {
		render(<HostsEmptyOrIncorrectMetrics noData incorrectData={false} />);
		expect(
			screen.getByText('No host metrics data received yet.'),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Infrastructure monitoring requires the/),
		).toBeInTheDocument();
	});

	it('shows incorrect data message when incorrectData is true', () => {
		render(<HostsEmptyOrIncorrectMetrics noData={false} incorrectData />);
		expect(
			screen.getByText(
				'To see host metrics, upgrade to the latest version of SigNoz k8s-infra chart. Please contact support if you need help.',
			),
		).toBeInTheDocument();
	});

	it('does not show no data message when noData is false', () => {
		render(<HostsEmptyOrIncorrectMetrics noData={false} incorrectData={false} />);
		expect(
			screen.queryByText('No host metrics data received yet.'),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Infrastructure monitoring requires the/),
		).not.toBeInTheDocument();
	});

	it('does not show incorrect data message when incorrectData is false', () => {
		render(<HostsEmptyOrIncorrectMetrics noData={false} incorrectData={false} />);
		expect(
			screen.queryByText(
				'To see host metrics, upgrade to the latest version of SigNoz k8s-infra chart. Please contact support if you need help.',
			),
		).not.toBeInTheDocument();
	});
});
