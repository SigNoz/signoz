import { useMemo } from 'react';
import type { TelemetrytypesSignalDTO } from 'api/generated/services/sigNoz.schemas';
import type { EQueryType } from 'types/common/dashboard';

import type { PanelKind } from '../../../Panels/types/panelKind';
import { PANEL_TYPES } from '../../../PanelsAndSectionsLayout/Panel/PanelTypeSelectionModal/constants';
import type { ConfigSelectItem } from '../controls/ConfigSelect/ConfigSelect';

import { getPanelTypeDisabledReason } from './utils';

interface UsePanelTypeSelectItemsArgs {
	/** Active query type — a kind that can't be authored in it is disabled. */
	queryType: EQueryType;
	/** Current datasource — also gates the disabled rule (List needs logs/traces, not metrics). */
	signal?: TelemetrytypesSignalDTO;
}

/**
 * Visualization-kind options for a `ConfigSelect`, each disabled (with a reason
 * tooltip) when the active query type or signal is incompatible — resolved through
 * the capabilities guard. Shared by the editor's `PanelTypeSwitcher` and the View
 * modal's header so the two selectors apply the same rule and can't drift.
 */
export function usePanelTypeSelectItems({
	queryType,
	signal,
}: UsePanelTypeSelectItemsArgs): ConfigSelectItem<PanelKind>[] {
	return useMemo(
		() =>
			PANEL_TYPES.map(({ panelKind, label, Icon }) => {
				// One reason drives both the disabled flag and the tooltip, so they can't disagree.
				const disabledReason = getPanelTypeDisabledReason({
					kind: panelKind,
					queryType,
					signal,
					label,
				});
				return {
					value: panelKind,
					label,
					icon: <Icon size={14} />,
					disabled: !!disabledReason,
					tooltip: disabledReason,
				};
			}),
		[queryType, signal],
	);
}
