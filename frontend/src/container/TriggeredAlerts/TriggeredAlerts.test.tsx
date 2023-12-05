import { render, screen } from 'tests/test-utils';

import TriggeredAlerts from '.';

describe('TriggeredAlerts', () => {
	test('Should render the table', async () => {
		render(<TriggeredAlerts />);
		screen.debug();
	});
});
