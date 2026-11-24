import { ReactElement } from 'react';
import { AppContext } from 'providers/App/App';
import { IAppContext } from 'providers/App/types';
import { getAppContextMock, render, screen } from 'tests/test-utils';

import SideNav from '../SideNav';

jest.mock('providers/cmdKProvider', () => ({
	useCmdK: (): { openCmdK: jest.Mock } => ({ openCmdK: jest.fn() }),
}));

jest.mock('hooks/hotkeys/useKeyboardHotkeys', () => ({
	useKeyboardHotkeys: (): Record<string, jest.Mock> => ({
		registerShortcut: jest.fn(),
		deregisterShortcut: jest.fn(),
	}),
}));

function SessionState({ value }: { value: IAppContext }): ReactElement {
	return (
		<AppContext.Provider value={value}>
			<SideNav isPinned />
		</AppContext.Provider>
	);
}

const pending = (): IAppContext =>
	getAppContextMock('ANONYMOUS', {
		isSessionPending: true,
		activeLicense: null,
	});

describe('SideNav while the session is pending', () => {
	it('shows placeholder rows instead of shortcuts and the empty-shortcuts hint', () => {
		render(<SessionState value={pending()} />);

		expect(screen.getByTestId('sidenav')).toBeInTheDocument();
		expect(screen.getByTestId('sidenav-items-skeleton')).toBeInTheDocument();
		expect(screen.queryByTestId('nav-item-services')).not.toBeInTheDocument();
		expect(
			screen.queryByText('You have not added any shortcuts yet.'),
		).not.toBeInTheDocument();
	});

	it('applies the role and license that arrive after the preferences', () => {
		const { rerender } = render(<SessionState value={pending()} />);

		expect(screen.queryByTestId('nav-item-integrations')).not.toBeInTheDocument();

		rerender(<SessionState value={getAppContextMock('ADMIN')} />);

		expect(
			screen.queryByTestId('sidenav-items-skeleton'),
		).not.toBeInTheDocument();
		expect(screen.getByTestId('nav-item-services')).toBeInTheDocument();
		expect(screen.getByTestId('nav-item-integrations')).toBeInTheDocument();
	});

	it('does not offer integrations to a viewer once the session settles', () => {
		const { rerender } = render(<SessionState value={pending()} />);

		rerender(<SessionState value={getAppContextMock('VIEWER')} />);

		expect(screen.getByTestId('nav-item-services')).toBeInTheDocument();
		expect(screen.queryByTestId('nav-item-integrations')).not.toBeInTheDocument();
	});
});
