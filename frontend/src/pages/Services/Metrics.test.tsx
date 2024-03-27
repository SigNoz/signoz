import { render, screen } from 'tests/test-utils';

import Metrics from '.';

describe('Services', () => {
	test('Should render the component', () => {
		render(<Metrics />);

		const inputBox = screen.getByTestId('resource-attributes-filter');
		expect(inputBox).toBeInTheDocument();

		expect(screen.getByTestId('resource-environment-filter')).toBeInTheDocument();

		const application = screen.getByRole('columnheader', {
			name: /application search/i,
		});
		expect(application).toBeInTheDocument();

		const p99 = screen.getByRole('columnheader', {
			name: /p99 latency \(in ms\)/i,
		});
		expect(p99).toBeInTheDocument();

		const errorRate = screen.getByRole('columnheader', {
			name: /error rate \(% of total\)/i,
		});
		expect(errorRate).toBeInTheDocument();

		const operationPerSecond = screen.getByRole('columnheader', {
			name: /operations per second/i,
		});
		expect(operationPerSecond).toBeInTheDocument();
	});

	// TODO: Fix this test
	// test('Should filter the table input according to input typed value', async () => {
	// 	user.setup();
	// 	render(<Metrics />);
	// 	const inputBox = screen.getByRole('combobox');
	// 	expect(inputBox).toBeInTheDocument();

	// 	await user.click(inputBox);

	// 	const signozCollectorId = await screen.findAllByText(/signoz.collector.id/i);
	// 	expect(signozCollectorId[0]).toBeInTheDocument();

	// 	screen.debug();

	// await user.click(signozCollectorId[1]);

	// await user.click(inputBox);

	// const inOperator = await screen.findAllByText(/not in/i);
	// expect(inOperator[1]).toBeInTheDocument();

	// await user.click(inOperator[1]);

	// await user.type(inputBox, '6d');

	// const serviceId = await screen.findAllByText(
	// 	/6d4af7f0-4884-4a37-abd4-6bdbee29fa04/i,
	// );

	// expect(serviceId[1]).toBeInTheDocument();

	// await user.click(serviceId[1]);

	// const application = await screen.findByText(/application/i);
	// expect(application).toBeInTheDocument();

	// await user.click(application);

	// const testService = await screen.findByText(/testservice/i);
	// expect(testService).toBeInTheDocument();
	// }, 30000);
});
