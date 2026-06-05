import { fireEvent, render, screen } from '@testing-library/react';

import ConfigPane from '../ConfigPane/ConfigPane';

describe('ConfigPane', () => {
	it('renders the seeded title and description', () => {
		render(
			<ConfigPane
				display={{ name: 'CPU', description: 'usage' }}
				onChangeDisplay={jest.fn()}
			/>,
		);

		expect(screen.getByTestId('panel-editor-v2-title')).toHaveValue('CPU');
		expect(screen.getByTestId('panel-editor-v2-description')).toHaveValue(
			'usage',
		);
	});

	it('reports title edits via onChangeDisplay', () => {
		const onChangeDisplay = jest.fn();
		render(
			<ConfigPane
				display={{ name: 'CPU', description: 'usage' }}
				onChangeDisplay={onChangeDisplay}
			/>,
		);

		fireEvent.change(screen.getByTestId('panel-editor-v2-title'), {
			target: { value: 'Memory' },
		});

		expect(onChangeDisplay).toHaveBeenCalledWith({ name: 'Memory' });
	});
});
