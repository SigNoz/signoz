import { render, screen, userEvent } from 'tests/test-utils';

import { makePricingRule } from '../../../../__tests__/fixtures';
import ModelCostActionsMenu from '../ModelCostActionsMenu';

const rule = makePricingRule({ id: 'rule-openai', modelName: 'gpt-4o' });

describe('ModelCostActionsMenu', () => {
	it('renders nothing when the user cannot manage', () => {
		const { container } = render(
			<ModelCostActionsMenu
				rule={rule}
				canManage={false}
				onEdit={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);

		expect(container.firstChild).toBeNull();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('renders a trigger button when the user can manage', () => {
		render(
			<ModelCostActionsMenu
				rule={rule}
				canManage
				onEdit={jest.fn()}
				onDelete={jest.fn()}
			/>,
		);

		expect(screen.getByRole('button')).toBeInTheDocument();
	});

	it('calls onEdit with the rule when clicking Edit', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onEdit = jest.fn();
		render(
			<ModelCostActionsMenu
				rule={rule}
				canManage
				onEdit={onEdit}
				onDelete={jest.fn()}
			/>,
		);

		await user.click(screen.getByRole('button'));
		await user.click(await screen.findByText('Edit'));

		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(onEdit).toHaveBeenCalledWith(rule);
	});

	it('calls onDelete with the rule when clicking Delete', async () => {
		const user = userEvent.setup({ pointerEventsCheck: 0 });
		const onDelete = jest.fn();
		render(
			<ModelCostActionsMenu
				rule={rule}
				canManage
				onEdit={jest.fn()}
				onDelete={onDelete}
			/>,
		);

		await user.click(screen.getByRole('button'));
		await user.click(await screen.findByText('Delete'));

		expect(onDelete).toHaveBeenCalledTimes(1);
		expect(onDelete).toHaveBeenCalledWith(rule);
	});
});
