import { Querybuildertypesv5RequestTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { TriangleAlert } from '@signozhq/icons';

import {
	NO_PANEL_ACTIONS,
	type RenderablePanelDefinition,
} from '../../types/panelDefinition';
import Renderer from './Renderer';

/**
 * Stand-in definition for a kind that isn't in the registry, so `getPanelDefinition`
 * always resolves and no caller has to branch on a missing one. It declares nothing: no
 * signals, no query types, no config sections and no actions — an unknown kind can't be
 * queried, configured or acted on, only shown as unsupported.
 *
 * `kind` carries a sentinel that no API enum value can collide with; the cast is the one
 * place this definition steps outside `PanelKind`.
 */
export const UNSUPPORTED_PANEL: RenderablePanelDefinition = {
	kind: '<unsupported>' as RenderablePanelDefinition['kind'],
	displayName: 'Unsupported panel',
	mode: 'query',
	// Never offered in the UI — the kind lists come from the registry, which omits this.
	icon: TriangleAlert,
	Renderer,
	sections: [],
	supportedSignals: [],
	supportedQueryTypes: [],
	queryBuilderFields: {},
	queryCapabilities: {
		requestType: Querybuildertypesv5RequestTypeDTO.time_series,
		formatTableResultForUI: false,
		bucketedStepInterval: false,
		orderTiebreaker: false,
		serverPaginated: false,
	},
	actions: NO_PANEL_ACTIONS,
};
