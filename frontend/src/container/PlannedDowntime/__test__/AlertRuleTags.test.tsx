import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from 'tests/test-utils';

import { AlertRuleTags } from '../PlannedDowntimeList';

const RULES = [
	{ label: 'Postgres connections near limit', value: 'rule-5' },
	{ label: 'Payment service error rate', value: 'rule-3' },
];

describe('AlertRuleTags', () => {
	it('removes a selected rule from its named remove button', async () => {
		const handleClose = jest.fn();
		render(
			<AlertRuleTags closable selectedTags={RULES} handleClose={handleClose} />,
		);

		await userEvent.click(
			screen.getByRole('button', {
				name: 'Remove Payment service error rate',
			}),
		);

		expect(handleClose).toHaveBeenCalledWith('rule-3');
	});

	it('renders no remove button when not closable', () => {
		render(<AlertRuleTags closable={false} selectedTags={RULES} />);

		expect(screen.queryByRole('button', { name: /^Remove/ })).toBeNull();
	});
});
