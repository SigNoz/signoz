import { render, screen } from '@testing-library/react';
import { PanelMode } from 'lib/visualization/panels/types';
import type { PanelOfKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';

import Renderer from '../Renderer';

function textPanel(text?: string): PanelOfKind<'signoz/TextPanel'> {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'Runbook' },
			plugin: { kind: 'signoz/TextPanel', spec: { text } },
			queries: [],
		},
	} as unknown as PanelOfKind<'signoz/TextPanel'>;
}

function renderPanel(text?: string): void {
	render(
		<Renderer
			panelId="p1"
			panel={textPanel(text)}
			panelMode={PanelMode.DASHBOARD_VIEW}
		/>,
	);
}

describe('Text panel empty state', () => {
	it.each([undefined, '', '   \n\t'])('stands in for a body of %j', (text) => {
		renderPanel(text);

		expect(screen.getByTestId('text-panel-empty')).toBeInTheDocument();
		expect(screen.getByText('Nothing written yet')).toBeInTheDocument();
	});

	it('gives way to the body once there is one', () => {
		renderPanel('# Runbook');

		expect(screen.queryByTestId('text-panel-empty')).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Runbook' })).toBeInTheDocument();
	});

	// An undefined variable renders literally, as queries treat one, so the body
	// is not empty and the panel shows it rather than the empty state.
	it('does not stand in for an unresolved variable', () => {
		renderPanel('$missing');

		expect(screen.queryByTestId('text-panel-empty')).not.toBeInTheDocument();
		expect(screen.getByText('$missing')).toBeInTheDocument();
	});
});
