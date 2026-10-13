import { fireEvent, render, screen } from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { PanelMode } from 'lib/visualization/panels/types';
import type { PanelOfKind } from 'pages/DashboardPage/DashboardContainer/Panels/types/rendererProps';

import Renderer from '../Renderer';

const SOURCE = ['- [ ] first', '- [x] second'].join('\n');

function textPanel(text: string): PanelOfKind<'signoz/TextPanel'> {
	return {
		kind: 'Panel',
		spec: {
			display: { name: 'Runbook' },
			plugin: { kind: 'signoz/TextPanel', spec: { text } },
			queries: [],
		},
	} as unknown as PanelOfKind<'signoz/TextPanel'>;
}

describe('Text panel task lists', () => {
	it('renders them read-only without a write channel', () => {
		render(
			<Renderer
				panelId="p1"
				panel={textPanel(SOURCE)}
				panelMode={PanelMode.DASHBOARD_VIEW}
			/>,
		);

		screen.getAllByRole('checkbox').forEach((box) => expect(box).toBeDisabled());
	});

	it('reports the rewritten body when a host can save it', () => {
		const onChangeText = jest.fn();
		render(
			<Renderer
				panelId="p1"
				panel={textPanel(SOURCE)}
				panelMode={PanelMode.DASHBOARD_VIEW}
				onChangeText={onChangeText}
			/>,
			{ wrapper: TooltipProvider },
		);

		fireEvent.click(screen.getAllByRole('checkbox')[0]);

		expect(onChangeText).toHaveBeenCalledWith(
			['- [x] first', '- [x] second'].join('\n'),
		);
	});

	it('edits the authored body, not the interpolated one', () => {
		const onChangeText = jest.fn();
		render(
			<Renderer
				panelId="p1"
				panel={textPanel('- [ ] deploy $service')}
				panelMode={PanelMode.DASHBOARD_VIEW}
				onChangeText={onChangeText}
			/>,
			{ wrapper: TooltipProvider },
		);

		fireEvent.click(screen.getByRole('checkbox'));

		expect(onChangeText).toHaveBeenCalledWith('- [x] deploy $service');
	});
});
