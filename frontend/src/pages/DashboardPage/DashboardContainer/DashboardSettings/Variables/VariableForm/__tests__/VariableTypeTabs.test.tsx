import { render, screen, userEvent } from 'tests/test-utils';

import VariableTypeTabs from '../VariableTypeTabs';

const panels = {
	DYNAMIC: <div>dynamic panel</div>,
	TEXT: <div>text panel</div>,
	CUSTOM: <div>custom panel</div>,
	QUERY: <div>query panel</div>,
};

describe('VariableTypeTabs', () => {
	it.each([
		['variable-type-custom', 'CUSTOM'],
		['variable-type-textbox', 'TEXT'],
		['variable-type-query', 'QUERY'],
	])('clicking %s calls onChange(%s)', async (testId, type) => {
		const onChange = jest.fn();
		render(
			<VariableTypeTabs value="DYNAMIC" onChange={onChange} panels={panels} />,
		);

		await userEvent.click(screen.getByTestId(testId));

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith(type);
	});

	it('shows the panel of the controlled value', () => {
		render(
			<VariableTypeTabs value="CUSTOM" onChange={jest.fn()} panels={panels} />,
		);

		expect(screen.getByText('custom panel')).toBeVisible();
		expect(screen.getByTestId('variable-type-custom')).toHaveAttribute(
			'aria-selected',
			'true',
		);
	});
});
