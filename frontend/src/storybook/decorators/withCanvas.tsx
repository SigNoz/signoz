import type { CSSProperties } from 'react';
import type { Decorator } from '@storybook/react-vite';

/**
 * Bounds a component story to the slot the app gives that component. The preview
 * lays every story out `fullscreen`, which is what a page wants and what leaves
 * a select or a filter rail stretched across the whole canvas.
 *
 * Opt in per component story with `decorators: [withCanvas({ maxWidth: 400 })]`.
 */
export const withCanvas = (style: CSSProperties): Decorator =>
	function Canvas(Story): JSX.Element {
		return (
			<div style={{ padding: 24, ...style }}>
				<Story />
			</div>
		);
	};
