import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { DashboardtypesPanelSpecDTO } from 'api/generated/services/sigNoz.schemas';
import { useIsDarkMode } from 'hooks/useDarkMode';

import { rgbaFromHex } from '../kinds/TextPanel/background/contrast';
import {
	INK_ALPHAS,
	PRESET_BORDER,
} from '../kinds/TextPanel/background/presets';
import { resolveTextBackground } from '../kinds/TextPanel/background/resolveTextBackground';
import {
	PanelTheme,
	TextBackgroundKind,
} from '../kinds/TextPanel/background/types';

export interface TextBackground {
	kind: TextBackgroundKind;
	/**
	 * Custom properties for the card root. Empty for `default`, so the stylesheet's
	 * own fallbacks decide — nothing here hardcodes a surface.
	 */
	style: CSSProperties;
}

const NO_STYLE: CSSProperties = {};

// D7: `None` drops the card so the body sits on the dashboard canvas. It rides the
// same properties as a colour, which takes the header's divider with it.
const CARDLESS_STYLE = {
	'--text-panel-surface': 'transparent',
	'--text-panel-border': 'transparent',
} as CSSProperties;

function inkShares(ink: string): Record<string, string> {
	return Object.fromEntries(
		Object.entries(INK_ALPHAS).map(([name, alpha]) => [
			name,
			rgbaFromHex(ink, alpha) ?? ink,
		]),
	);
}

/**
 * The card is an ancestor of the renderer, so the host owns these properties and
 * everything below inherits them.
 *
 * Reading one plugin-spec field off the kind union is the accepted smell (TDD
 * D7): a dynamic kind can't narrow it, hence one localized cast per host.
 */
export function useTextBackground(
	spec: DashboardtypesPanelSpecDTO,
): TextBackground {
	const isDarkMode = useIsDarkMode();
	const background = (
		spec.plugin.spec as {
			presentation?: { background?: string | null };
		}
	).presentation?.background;

	return useMemo(() => {
		const theme = isDarkMode ? PanelTheme.Dark : PanelTheme.Light;
		const resolved = resolveTextBackground(background, theme);

		if (resolved.kind === TextBackgroundKind.None) {
			return { kind: resolved.kind, style: CARDLESS_STYLE };
		}

		return {
			kind: resolved.kind,
			style:
				resolved.surface && resolved.ink
					? ({
							'--text-panel-surface': resolved.surface,
							'--text-panel-ink': resolved.ink,
							'--text-panel-border': PRESET_BORDER[theme],
							'--text-panel-link-decoration': 'underline',
							...inkShares(resolved.ink),
						} as CSSProperties)
					: NO_STYLE,
		};
	}, [background, isDarkMode]);
}
