import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import DrilldownDashboardVariablesMenu from '../DrilldownMenu/DrilldownDashboardVariablesMenu';
import {
	type DrilldownVariableAction,
	DrilldownVariableActionKind,
} from '../hooks/useDrilldownDashboardVariables';

jest.mock('components/OverlayScrollbar/OverlayScrollbar', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }): JSX.Element => (
		<div>{children}</div>
	),
}));

function action(
	overrides: Partial<DrilldownVariableAction> = {},
): DrilldownVariableAction {
	return {
		fieldName: 'service.name',
		fieldValue: 'frontend',
		kind: DrilldownVariableActionKind.Set,
		onClick: jest.fn(),
		...overrides,
	};
}

describe('DrilldownDashboardVariablesMenu', () => {
	it('renders each kind with its own label and fires its onClick', async () => {
		const onSet = jest.fn();
		const onUnset = jest.fn();
		const onCreate = jest.fn();
		render(
			<DrilldownDashboardVariablesMenu
				onBack={jest.fn()}
				actions={[
					action({
						fieldName: 'a',
						kind: DrilldownVariableActionKind.Set,
						onClick: onSet,
					}),
					action({
						fieldName: 'b',
						kind: DrilldownVariableActionKind.Unset,
						onClick: onUnset,
					}),
					action({
						fieldName: 'c',
						kind: DrilldownVariableActionKind.Create,
						onClick: onCreate,
					}),
				]}
			/>,
		);

		expect(screen.getByTestId('drilldown-var-set')).toBeInTheDocument();
		expect(screen.getByTestId('drilldown-var-unset')).toBeInTheDocument();
		expect(screen.getByTestId('drilldown-var-create')).toBeInTheDocument();

		await userEvent.click(screen.getByTestId('drilldown-var-set'));
		expect(onSet).toHaveBeenCalledTimes(1);
	});

	it('returns to the base menu when the back arrow is clicked', async () => {
		const onBack = jest.fn();
		render(
			<DrilldownDashboardVariablesMenu onBack={onBack} actions={[action()]} />,
		);

		await userEvent.click(screen.getByTestId('drilldown-var-back'));
		expect(onBack).toHaveBeenCalledTimes(1);
	});
});
