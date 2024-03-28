import { act } from 'react-dom/test-utils';
import { render, screen } from 'tests/test-utils';

import TriggeredAlerts from '.';

describe('TriggeredAlerts', () => {
	test('Should render the table', async () => {
		act(() => {
			render(<TriggeredAlerts />);
		});

		const status = await screen.findByText('Status');
		expect(status).toBeInTheDocument();

		const alertName = await screen.findByText('Alert Name');
		expect(alertName).toBeInTheDocument();

		const severity = await screen.findByText('Severity');
		expect(severity).toBeInTheDocument();

		const tags = await screen.findByText('Tags');
		expect(tags).toBeInTheDocument();

		const firedSince = await screen.findByText('Firing Since');
		expect(firedSince).toBeInTheDocument();
	});

	// test('Should render the table data in triggeredAlert', async () => {
	// 	act(() => {
	// 		render(<TriggeredAlerts />);
	// 	});

	// 	const row = await screen.findByRole('row', {
	// 		name: /firing above 400ms alertname: above 400ms component: net\/http details: https:\/\/demo\.\.\.\. \+2 warning 11\/30\/2023 10:04:19 am/i,
	// 	});
	// 	expect(row).toBeInTheDocument();
	// });
});
