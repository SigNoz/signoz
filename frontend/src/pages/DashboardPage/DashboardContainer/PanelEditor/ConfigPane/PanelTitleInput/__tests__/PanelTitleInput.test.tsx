import { useState } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

import PanelTitleInput from '../PanelTitleInput';

jest.mock(
	'pages/DashboardPage/DashboardContainer/hooks/useDashboardVariableNames',
	() => ({
		useDashboardVariableNames: (): string[] => ['service.name', 'env'],
	}),
);

function Harness({ initial = '' }: { initial?: string }): JSX.Element {
	const [value, setValue] = useState(initial);
	return <PanelTitleInput value={value} onChange={setValue} />;
}

describe('PanelTitleInput', () => {
	it('suggests no variables until a `$` is typed', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.type(screen.getByTestId('panel-editor-v2-title'), 'Latency');

		expect(screen.queryByText('env')).not.toBeInTheDocument();
	});

	it('suggests variables matching the text after `$`', async () => {
		const user = userEvent.setup();
		render(<Harness />);

		await user.type(
			screen.getByTestId('panel-editor-v2-title'),
			'Latency of $se',
		);

		await expect(screen.findByText('service.name')).resolves.toBeInTheDocument();
		expect(screen.queryByText('env')).not.toBeInTheDocument();
	});

	it('inserts the picked variable into the title', async () => {
		const user = userEvent.setup();
		render(<Harness />);
		const input = screen.getByTestId('panel-editor-v2-title');

		await user.type(input, 'Latency of $se');
		await user.click(await screen.findByText('service.name'));

		expect(input).toHaveValue('Latency of $service.name');
	});
});
