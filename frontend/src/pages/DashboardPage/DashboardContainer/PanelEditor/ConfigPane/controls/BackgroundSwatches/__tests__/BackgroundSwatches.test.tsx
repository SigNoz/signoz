import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '@signozhq/ui/tooltip';
import { TEXT_BACKGROUND_PAIRS } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/presets';
import {
	PanelTheme,
	TextBackgroundKind,
	TextBackgroundPreset,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/TextPanel/background/types';

import BackgroundSwatches from '../BackgroundSwatches';

function renderRow(
	props: Partial<React.ComponentProps<typeof BackgroundSwatches>> = {},
): jest.Mock {
	const onChange = jest.fn();
	render(
		<TooltipProvider>
			<BackgroundSwatches
				testId="background"
				label="Panel background"
				theme={PanelTheme.Dark}
				value={TextBackgroundKind.Default}
				onChange={onChange}
				{...props}
			/>
		</TooltipProvider>,
	);
	return onChange;
}

describe('BackgroundSwatches', () => {
	it('offers transparent, the default surface and the eight presets in order', () => {
		renderRow();

		expect(
			screen
				.getAllByRole('radio')
				.map((swatch) => swatch.getAttribute('aria-label')),
		).toStrictEqual([
			'Transparent',
			'Default panel',
			'Robin',
			'Purple',
			'Sakura',
			'Cherry',
			'Amber',
			'Forest',
			'Sienna',
			'Slate',
		]);
	});

	it('is one labelled group', () => {
		renderRow();

		expect(
			screen.getByRole('radiogroup', { name: 'Panel background' }),
		).toBeInTheDocument();
	});

	it.each([
		['background-none', 'Transparent — no card, border or title bar'],
		['background-default', 'Default panel colour'],
		['background-sakura', 'Sakura'],
	])('explains %s on hover', async (swatchId, copy) => {
		renderRow();

		fireEvent.focus(screen.getByTestId(swatchId));

		await waitFor(() => {
			expect(screen.getByRole('tooltip')).toHaveTextContent(copy);
		});
	});

	it('paints each preset in the given theme', () => {
		renderRow({ theme: PanelTheme.Light });

		expect(screen.getByTestId('background-amber')).toHaveStyle({
			background: TEXT_BACKGROUND_PAIRS.amber.light.surface,
			color: TEXT_BACKGROUND_PAIRS.amber.light.ink,
		});
	});

	it('marks only the selected swatch, and checks it', () => {
		renderRow({ value: TextBackgroundPreset.Forest });

		expect(screen.getByRole('radio', { name: 'Forest' })).toBeChecked();
		expect(
			screen.getByRole('radio', { name: 'Default panel' }),
		).not.toBeChecked();
		expect(
			screen.getByTestId('background-forest').querySelector('svg'),
		).toBeInTheDocument();
		expect(
			screen.getByTestId('background-default').querySelector('svg'),
		).not.toBeInTheDocument();
	});

	it('reports the swatch that was clicked', () => {
		const onChange = renderRow();

		fireEvent.click(screen.getByRole('radio', { name: 'Sienna' }));

		expect(onChange).toHaveBeenCalledWith('sienna');
	});

	// jsdom does not implement radio arrow navigation, so the shared name — what
	// makes them one group — is what there is to assert.
	it('groups every swatch under one radio name', () => {
		renderRow();

		const names = new Set(
			screen.getAllByRole('radio').map((swatch) => swatch.getAttribute('name')),
		);

		expect(names).toStrictEqual(new Set(['background']));
	});
});
