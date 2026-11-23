import { render, screen } from 'tests/test-utils';

import EventsNotConfigured from '../EventsNotConfigured';

describe('EventsNotConfigured', () => {
	it('links to the k8s events docs in a new tab', () => {
		render(<EventsNotConfigured />);

		const link = screen.getByTestId('events-not-configured-docs-link');

		expect(link).toHaveAttribute(
			'href',
			'https://signoz.io/docs/infrastructure-monitoring/k8s-metrics/',
		);
		expect(link).toHaveAttribute('target', '_blank');
	});
});
