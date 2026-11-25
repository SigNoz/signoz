import { changelog } from 'components/ChangelogModal/stories/__story_mockdata__/changelog';
import { screen } from 'tests/test-utils';

import { flushPendingImports, renderAppLayout } from './testUtils';

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

	it('does not load the changelog modal until it opens', async () => {
		renderAppLayout({ changelog, showChangelogModal: false });
		await flushPendingImports();

		expect(screen.queryByTestId('changelog-modal')).not.toBeInTheDocument();
		expect(mockChangelogModuleLoaded).not.toHaveBeenCalled();
	});

	it('loads and shows the changelog modal when it opens', async () => {
		renderAppLayout({ changelog, showChangelogModal: true });

		await expect(
			screen.findByTestId('changelog-modal'),
		).resolves.toBeInTheDocument();
	});
});
