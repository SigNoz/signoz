import { getResourceDeploymentKeys } from 'hooks/useResourceAttribute/utils';
import { render, screen, userEvent } from 'tests/test-utils';

import QueryChip from '../QueryChip';

// Badge renders its suffix inside an aria-hidden span.
const getRemoveButton = (): HTMLElement =>
	screen.getByRole('button', { name: 'Remove', hidden: true });

describe('QueryChip', () => {
	it('calls onClose once with the query id when the remove button is clicked', async () => {
		const onClose = jest.fn();
		render(
			<QueryChip
				queryData={{
					id: 'q1',
					tagKey: 'resource_service_name',
					operator: 'IN',
					tagValue: ['frontend', 'backend'],
				}}
				onClose={onClose}
			/>,
		);

		expect(screen.getByText('frontend, backend')).toBeInTheDocument();
		await userEvent.click(getRemoveButton());

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledWith('q1');
	});

	it('renders no remove button for the deployment environment chip', () => {
		render(
			<QueryChip
				queryData={{
					id: 'q2',
					tagKey: getResourceDeploymentKeys(),
					operator: 'IN',
					tagValue: ['prod'],
				}}
				onClose={jest.fn()}
			/>,
		);

		expect(screen.getByText('prod')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Remove', hidden: true }),
		).not.toBeInTheDocument();
	});
});
