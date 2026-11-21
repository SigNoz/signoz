import { HelmetProvider } from 'react-helmet-async';
import { changelog } from 'components/ChangelogModal/stories/__story_mockdata__/changelog';
import { CmdKProvider } from 'providers/cmdKProvider';
import { render, screen } from 'tests/test-utils';

import AppLayout from '../index';

const mockChangelogModuleLoaded = jest.fn();

jest.mock('components/ChangelogModal/ChangelogModal', () => {
	mockChangelogModuleLoaded();
	return {
		__esModule: true,
		default: (): JSX.Element => <div data-testid="changelog-modal" />,
	};
});

describe('AppLayout changelog modal', () => {
	beforeEach(() => {
		mockChangelogModuleLoaded.mockClear();
	});

	it('does not load the changelog modal until it opens', () => {
		render(
			<HelmetProvider>
				<CmdKProvider>
					<AppLayout>
						<div />
					</AppLayout>
				</CmdKProvider>
			</HelmetProvider>,
			undefined,
			{ appContextOverrides: { changelog, showChangelogModal: false } },
		);

		expect(screen.queryByTestId('changelog-modal')).not.toBeInTheDocument();
		expect(mockChangelogModuleLoaded).not.toHaveBeenCalled();
	});

	it('loads and shows the changelog modal when it opens', async () => {
		render(
			<HelmetProvider>
				<CmdKProvider>
					<AppLayout>
						<div />
					</AppLayout>
				</CmdKProvider>
			</HelmetProvider>,
			undefined,
			{ appContextOverrides: { changelog, showChangelogModal: true } },
		);

		await expect(
			screen.findByTestId('changelog-modal'),
		).resolves.toBeInTheDocument();
		expect(mockChangelogModuleLoaded).toHaveBeenCalled();
	});
});
