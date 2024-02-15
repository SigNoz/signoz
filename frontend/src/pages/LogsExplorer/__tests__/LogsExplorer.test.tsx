import { render } from '@testing-library/react';

import LogsExplorer from '..';

jest.mock('uplot', () => jest.fn);

describe('Logs Explorer Tests', () => {
	test('Logs Explorer default view test', () => {
		const { container } = render(<LogsExplorer />);

		expect(container).toMatchSnapshot();
	});
});
