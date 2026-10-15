import { lazy, Suspense } from 'react';

import PanelStyles from '../../panel.module.scss';
import type { PanelRendererProps } from '../../types/rendererProps';

const GeoMapPanelBody = lazy(
	() => import('./components/GeoMapPanelBody/GeoMapPanelBody'),
);

function GeoMapPanelRenderer(
	props: PanelRendererProps<'signoz/GeoMapPanel'>,
): JSX.Element {
	return (
		<div
			data-testid="geo-map-panel-renderer"
			className={PanelStyles.panelContainer}
		>
			<Suspense fallback={null}>
				<GeoMapPanelBody {...props} />
			</Suspense>
		</div>
	);
}

export default GeoMapPanelRenderer;
