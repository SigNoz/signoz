import { PageTypeDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { QueryParams } from 'constants/query';

import { getAutoContexts } from './getAutoContexts';

const PAGE_METADATA_TO_DTO: Record<string, PageTypeDTO> = {
	dashboard_detail: PageTypeDTO.dashboard_detail,
	dashboard_list: PageTypeDTO.dashboard_list,
	panel_edit: PageTypeDTO.panel_edit,
	panel_fullscreen: PageTypeDTO.panel_fullscreen,
	logs_explorer: PageTypeDTO.logs_explorer,
	trace_detail: PageTypeDTO.trace_detail,
	traces_explorer: PageTypeDTO.traces_explorer,
	metrics_explorer: PageTypeDTO.metrics_explorer,
	service_detail: PageTypeDTO.service_detail,
	services_list: PageTypeDTO.services_list,
	alert_edit: PageTypeDTO.alert_edit,
	alert_list: PageTypeDTO.alert_list,
	alert_new: PageTypeDTO.alert_new,
	alerts_triggered: PageTypeDTO.alerts_triggered,
	homepage: PageTypeDTO.homepage,
	infra_entity_detail: PageTypeDTO.infra_entity_detail,
};

interface ResolvePageTypeOptions {
	/** Standalone `/ai-assistant` surface — no underlying observability page. */
	isStandaloneAssistant?: boolean;
}

/**
 * Maps the current URL (and assistant surface) to the backend `page_type`
 * enum used by contextual empty-state chips.
 */
export function resolvePageType(
	pathname: string,
	search: string,
	options?: ResolvePageTypeOptions,
): PageTypeDTO {
	if (options?.isStandaloneAssistant) {
		return PageTypeDTO.other;
	}

	const contexts = getAutoContexts(pathname, search);
	const page = contexts[0]?.metadata?.page;
	if (typeof page === 'string') {
		if (page === 'logs_explorer') {
			const activeLogId = new URLSearchParams(search).get(QueryParams.activeLogId);
			if (activeLogId) {
				return PageTypeDTO.log_detail;
			}
		}
		const mapped = PAGE_METADATA_TO_DTO[page];
		if (mapped) {
			return mapped;
		}
	}

	return PageTypeDTO.other;
}
