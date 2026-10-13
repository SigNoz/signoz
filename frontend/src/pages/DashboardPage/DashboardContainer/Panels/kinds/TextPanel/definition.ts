import { Type } from '@signozhq/icons';

import type { PanelDefinition } from '../../types/panelDefinition';
import TextEditorPane from './components/TextEditorPane/TextEditorPane';
import Renderer from './Renderer';
import { sections } from './sections';

export const definition: PanelDefinition<'signoz/TextPanel'> = {
	kind: 'signoz/TextPanel',
	displayName: 'Text',
	icon: Type,
	sections,
	mode: 'static',
	Renderer,
	EditorPane: TextEditorPane,
	actions: {
		view: true,
		edit: true,
		clone: true,
		// Nothing tabular or chart-like to export; the body is already the readable form.
		download: { csv: false, png: false, svg: false },
		createAlert: false,
		search: false,
		drilldown: false,
	},
};
