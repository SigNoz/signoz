import { ReactNode } from 'react';
import { render, screen, userEvent } from 'tests/test-utils';

import PrettyView from '../PrettyView';

jest.mock('react-use', () => ({
	...jest.requireActual('react-use'),
	useCopyToClipboard: (): [unknown, jest.Mock] => [{}, jest.fn()],
}));

jest.mock('@signozhq/ui/toast', () => ({
	...jest.requireActual('@signozhq/ui/toast'),
	toast: { success: jest.fn(), danger: jest.fn() },
}));

describe('PrettyView', () => {
	it('keeps a nested node expanded when one of its menu actions is picked', async () => {
		const user = userEvent.setup();
		render(
			<PrettyView
				data={{ resource: { 'service.name': 'checkout' } }}
				searchable={false}
			/>,
		);
		expect(screen.getByText(/checkout/)).toBeInTheDocument();

		await user.click(screen.getByTestId('pretty-view-actions-resource'));
		await user.click(await screen.findByRole('menuitem', { name: 'Copy Value' }));

		expect(screen.getByText(/checkout/)).toBeInTheDocument();
	});

	it('renders the label suffix after the key whose path it accepts', () => {
		render(
			<PrettyView
				data={{ resource: { 'service.name': 'checkout', 'host.name': 'h1' } }}
				searchable={false}
				labelSuffixRenderer={renderServiceNameSuffix}
			/>,
		);

		expect(screen.getByTestId('label-suffix')).toHaveTextContent(
			'resource/service.name',
		);
	});

	it('gives a pinned row the path of the key it was pinned from', () => {
		render(
			<PrettyView
				data={{ resource: { 'service.name': 'checkout' } }}
				searchable={false}
				showPinned
				pinnedFieldsValue={['["resource","service.name"]']}
				labelSuffixRenderer={renderServiceNameSuffix}
			/>,
		);

		expect(screen.getAllByTestId('label-suffix')).toHaveLength(2);
	});
});

function renderServiceNameSuffix(
	fieldKeyPath: readonly (string | number)[],
): ReactNode {
	const path = fieldKeyPath.join('/');
	if (path !== 'resource/service.name') {
		return null;
	}
	return <span data-testid="label-suffix">{path}</span>;
}
