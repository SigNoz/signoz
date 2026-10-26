import { useCallback } from 'react';
import logEvent from 'api/common/logEvent';
import { RuletypesAlertTypeDTO } from 'api/generated/services/sigNoz.schemas';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { sanitizeDefaultAlertQuery } from 'container/EditAlertV2/utils';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { useTableRowClick } from 'hooks/useTableRowClick';
import useUrlQuery from 'hooks/useUrlQuery';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { toAISlotQuery } from 'lib/query/builderSlot';
import { toCompositeMetricQuery } from 'types/api/alerts/convert';
import { isModifierKeyPressed } from 'utils/app';

import type { AlertRule } from './types';

interface UseAlertRulesHandlersReturn {
	handleEdit: (rule: AlertRule, options?: { newTab?: boolean }) => void;
	handleNewAlert: (e: React.MouseEvent) => void;
	handleRowClick: (rule: AlertRule) => void;
	handleRowClickNewTab: (rule: AlertRule) => void;
}

export function useAlertRulesHandlers(
	allRulesCount: number,
): UseAlertRulesHandlersReturn {
	const { safeNavigate } = useSafeNavigate();
	const params = useUrlQuery();

	const getEditUrl = useCallback(
		(rule: AlertRule): string => {
			const query = sanitizeDefaultAlertQuery(
				mapQueryDataFromApi(toCompositeMetricQuery(rule.condition.compositeQuery)),
				rule.alertType,
			);
			const compositeQuery =
				rule.alertType === RuletypesAlertTypeDTO.AI_TRACES_BASED_ALERT
					? toAISlotQuery(query)
					: query;
			params.set(
				QueryParams.compositeQuery,
				encodeURIComponent(JSON.stringify(compositeQuery)),
			);

			const panelType = rule.condition.compositeQuery.panelType;
			if (panelType) {
				params.set(QueryParams.panelTypes, panelType);
			}

			params.set(QueryParams.ruleId, rule.id);

			return `${ROUTES.ALERT_OVERVIEW}?${params.toString()}`;
		},
		[params],
	);

	const handleEdit = useCallback(
		(rule: AlertRule, options?: { newTab?: boolean }): void => {
			safeNavigate(getEditUrl(rule), options);
		},
		[getEditUrl, safeNavigate],
	);

	const handleNewAlert = useCallback(
		(e: React.MouseEvent): void => {
			void logEvent('Alert: New alert button clicked', {
				number: allRulesCount,
				layout: 'new',
			});
			safeNavigate(ROUTES.ALERTS_NEW, {
				newTab: isModifierKeyPressed(e),
			});
		},
		[allRulesCount, safeNavigate],
	);

	const { handleRowClick, handleRowClickNewTab } = useTableRowClick<AlertRule>({
		getUrl: getEditUrl,
		onNavigate: safeNavigate,
	});

	return {
		handleEdit,
		handleNewAlert,
		handleRowClick,
		handleRowClickNewTab,
	};
}
