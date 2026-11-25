import { HelmetProvider } from 'react-helmet-async';
import { CmdKProvider } from 'providers/cmdKProvider';
import { IAppContext } from 'providers/App/types';
import { act, render } from 'tests/test-utils';

import AppLayout from '../index';

export async function flushPendingImports(): Promise<void> {
	await act(async () => {
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
	});
}

export function renderAppLayout(
	appContextOverrides: Partial<IAppContext>,
): void {
	render(
		<HelmetProvider>
			<CmdKProvider>
				<AppLayout>
					<div data-testid="page-content">Page content</div>
				</AppLayout>
			</CmdKProvider>
		</HelmetProvider>,
		undefined,
		{ appContextOverrides },
	);
}
