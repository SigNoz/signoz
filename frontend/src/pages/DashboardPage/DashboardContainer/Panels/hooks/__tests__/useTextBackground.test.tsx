import { renderHook } from '@testing-library/react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';

import { rgbaFromHex } from '../../kinds/TextPanel/background/contrast';
import {
	INK_ALPHAS,
	SECONDARY_INK_OPACITY,
	TEXT_BACKGROUND_PAIRS,
	TRANSPARENT_BACKGROUND,
} from '../../kinds/TextPanel/background/presets';
import { useTextBackground } from '../useTextBackground';

const isDarkMode = jest.fn<boolean, []>(() => true);

jest.mock('hooks/useDarkMode', () => ({
	useIsDarkMode: (): boolean => isDarkMode(),
}));

function textPanel(background?: string): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'Panel' },
		plugin: {
			kind: 'signoz/TextPanel',
			spec: { text: '', presentation: { background } },
		},
		queries: [],
	} as unknown as DashboardtypesPanelSpecDTO;
}

describe('useTextBackground', () => {
	beforeEach(() => {
		isDarkMode.mockReturnValue(true);
	});

	it('sets no custom properties for the default surface', () => {
		const { result } = renderHook(() => useTextBackground(textPanel()));

		expect(result.current).toStrictEqual({ kind: 'default', style: {} });
	});

	// The card, its border and the header's divider all read these.
	it('paints a zero-alpha background transparent rather than dropping the card', () => {
		const { result } = renderHook(() =>
			useTextBackground(textPanel(TRANSPARENT_BACKGROUND)),
		);

		expect(result.current).toStrictEqual({
			kind: 'none',
			style: {
				'--text-panel-surface': 'transparent',
				'--text-panel-border': 'transparent',
			},
		});
	});

	it('exposes the preset pair for the current theme', () => {
		const { result } = renderHook(() =>
			useTextBackground(textPanel(TEXT_BACKGROUND_PAIRS.amber.dark.surface)),
		);

		const { ink } = TEXT_BACKGROUND_PAIRS.amber.dark;

		expect(result.current.style).toStrictEqual({
			'--text-panel-surface': TEXT_BACKGROUND_PAIRS.amber.dark.surface,
			'--text-panel-ink': ink,
			'--text-panel-border': 'rgba(255, 255, 255, 0.09)',
			'--text-panel-link-decoration': 'underline',
			'--text-panel-ink-secondary': rgbaFromHex(ink, SECONDARY_INK_OPACITY),
			'--text-panel-grip': rgbaFromHex(ink, INK_ALPHAS['--text-panel-grip']),
			'--scrollbar-thumb': rgbaFromHex(ink, INK_ALPHAS['--scrollbar-thumb']),
			'--scrollbar-thumb-hover': rgbaFromHex(
				ink,
				INK_ALPHAS['--scrollbar-thumb-hover'],
			),
			'--text-panel-pill-surface': rgbaFromHex(
				ink,
				INK_ALPHAS['--text-panel-pill-surface'],
			),
		});
	});

	it('draws the surface chrome from the ink', () => {
		const { result } = renderHook(() =>
			useTextBackground(textPanel(TEXT_BACKGROUND_PAIRS.amber.light.surface)),
		);

		Object.keys(INK_ALPHAS).forEach((name) => {
			expect(result.current.style).toHaveProperty(name);
		});
	});

	// Stored light, read in dark: the ink is the dark pair's.
	it('carries the secondary ink and the link underline', () => {
		const { result } = renderHook(() =>
			useTextBackground(textPanel(TEXT_BACKGROUND_PAIRS.sakura.light.surface)),
		);

		expect(result.current.style).toMatchObject({
			'--text-panel-ink-secondary': `rgba(253, 232, 242, ${SECONDARY_INK_OPACITY})`,
			'--text-panel-link-decoration': 'underline',
		});
	});

	it('re-resolves a stored surface when the theme changes', () => {
		const spec = textPanel(TEXT_BACKGROUND_PAIRS.forest.dark.surface);
		const { result, rerender } = renderHook(() => useTextBackground(spec));

		expect(result.current.style).toMatchObject({
			'--text-panel-surface': TEXT_BACKGROUND_PAIRS.forest.dark.surface,
		});

		isDarkMode.mockReturnValue(false);
		rerender();

		expect(result.current.style).toMatchObject({
			'--text-panel-surface': TEXT_BACKGROUND_PAIRS.forest.light.surface,
			'--text-panel-ink': TEXT_BACKGROUND_PAIRS.forest.light.ink,
			'--text-panel-border': 'rgba(0, 0, 0, 0.07)',
		});
	});

	it('paints a custom colour the same in both themes', () => {
		const spec = textPanel('#3A2A64');
		const { result, rerender } = renderHook(() => useTextBackground(spec));
		const inDark = result.current.style;

		isDarkMode.mockReturnValue(false);
		rerender();

		expect(result.current.style).toMatchObject({
			'--text-panel-surface': '#3A2A64',
			'--text-panel-ink': inDark['--text-panel-ink' as keyof typeof inDark],
		});
	});

	it('leaves a kind without a presentation slice alone', () => {
		const { result } = renderHook(() =>
			useTextBackground({
				display: { name: 'Panel' },
				plugin: { kind: 'signoz/TimeSeriesPanel', spec: {} },
				queries: [],
			} as unknown as DashboardtypesPanelSpecDTO),
		);

		expect(result.current).toStrictEqual({ kind: 'default', style: {} });
	});
});
