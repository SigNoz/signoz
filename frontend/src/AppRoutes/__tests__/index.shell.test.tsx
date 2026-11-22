import { ReactNode } from 'react';
import ROUTES from 'constants/routes';
import { render, screen, within } from 'tests/test-utils';

import App from '..';

jest.mock('container/AppLayout', () => ({
	__esModule: true,
	default: ({ children }: { children: ReactNode }): JSX.Element => (
		<div data-testid="app-layout">{children}</div>
	),
}));

jest.mock('components/cmdKPalette/cmdKPalette', () => ({
	CmdKPalette: (): JSX.Element => <div data-testid="cmdk-palette" />,
}));

jest.mock('components/ShiftOverlay/ShiftHoldOverlayController', () => ({
	ShiftHoldOverlayController: (): JSX.Element => (
		<div data-testid="shift-overlay" />
	),
}));

jest.mock('app/AppShell', () => ({
	__esModule: true,
	default: ({
		overlays,
		children,
	}: {
		overlays?: ReactNode;
		children: ReactNode;
	}): JSX.Element => (
		<>
			{overlays}
			{children}
		</>
	),
}));

jest.mock('app/AppPageProviders', () => ({
	__esModule: true,
	default: ({
		layout,
		children,
	}: {
		layout: (children: ReactNode) => ReactNode;
		children: ReactNode;
	}): JSX.Element => <>{layout(children)}</>,
}));

describe('AppRoutes shell', () => {
	it('mounts the layout with a placeholder page while the session is pending', () => {
		render(<App />, undefined, {
			initialRoute: ROUTES.HOME,
			appContextOverrides: { isSessionPending: true },
		});

		const layout = screen.getByTestId('app-layout');
		expect(within(layout).getByLabelText('loading')).toBeInTheDocument();
		expect(screen.queryByTestId('cmdk-palette')).not.toBeInTheDocument();
		expect(screen.queryByTestId('shift-overlay')).not.toBeInTheDocument();
	});

	it('keeps the layout while the preflight is still loading for a logged-in user', () => {
		render(<App />, undefined, {
			initialRoute: ROUTES.HOME,
			appContextOverrides: { isPreflightLoading: true, isSessionPending: true },
		});

		expect(screen.getByTestId('app-layout')).toBeInTheDocument();
	});

	it('replaces the page placeholder and mounts the overlays once the session settles', () => {
		render(<App />, undefined, { initialRoute: ROUTES.HOME });

		const layout = screen.getByTestId('app-layout');
		expect(within(layout).queryByLabelText('loading')).not.toBeInTheDocument();
		expect(screen.getByTestId('cmdk-palette')).toBeInTheDocument();
		expect(screen.getByTestId('shift-overlay')).toBeInTheDocument();
	});

	it('shows only a spinner to a visitor without a session while the preflight is loading', () => {
		render(<App />, undefined, {
			initialRoute: ROUTES.HOME,
			appContextOverrides: {
				isLoggedIn: false,
				isPreflightLoading: true,
				isSessionPending: false,
			},
		});

		expect(screen.queryByTestId('app-layout')).not.toBeInTheDocument();
		expect(screen.getByLabelText('loading')).toBeInTheDocument();
	});
});
