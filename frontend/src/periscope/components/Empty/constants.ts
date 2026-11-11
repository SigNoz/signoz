import type { CSSProperties } from 'react';

import type { SimpleImageColors } from './types';

export const DEFAULT_DESCRIPTION = 'No data';

export const DARK_DEFAULT_IMAGE_STYLE: CSSProperties = { opacity: 0.65 };

/** antd's `colorFill`, `colorFillTertiary` and `colorFillQuaternary` flattened onto the app's container background. */
export const SIMPLE_IMAGE_COLORS: Record<'light' | 'dark', SimpleImageColors> =
	{
		light: { border: '#d9d9d9', shadow: '#f5f5f5', content: '#fafafa' },
		dark: { border: '#3d3d41', shadow: '#25262a', content: '#1b1c20' },
	};
