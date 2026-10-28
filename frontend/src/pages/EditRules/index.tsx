import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import { useGetRuleByID } from 'api/generated/services/rules';
import type {
	RenderErrorResponseDTO,
	RuletypesRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import EditAlertV2 from 'container/EditAlertV2';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { fromRuleDTOToPostableRuleV2 } from 'types/api/alerts/convert';

import './EditRules.styles.scss';

function EditRules(): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const params = useUrlQuery();
	const ruleId = params.get(QueryParams.ruleId);
	const { t } = useTranslation('common');

	const isValidRuleId = ruleId !== null && String(ruleId).length !== 0;

	const { isLoading, data, isRefetching, isError, error } = useGetRuleByID(
		{ id: ruleId || '' },
		{
			query: {
				enabled: isValidRuleId,
				refetchOnMount: false,
				refetchOnWindowFocus: false,
			},
		},
	);

	const { notifications } = useNotifications();

	const clickHandler = (): void => {
		params.delete(QueryParams.compositeQuery);
		params.delete(QueryParams.panelTypes);
		params.delete(QueryParams.ruleId);
		params.delete(QueryParams.relativeTime);
		history.push(`${ROUTES.LIST_ALL_ALERT}?${params.toString()}`);
	};

	useEffect(() => {
		if (!isValidRuleId) {
			notifications.error({
				message: 'Rule Id is required',
			});
			safeNavigate(ROUTES.LIST_ALL_ALERT);
		}
	}, [isValidRuleId, ruleId, notifications, safeNavigate]);

	const ruleData: RuletypesRuleDTO | undefined = data?.data;

	const apiError = useMemo(
		() => convertToApiError(error as AxiosError<RenderErrorResponseDTO> | null),
		[error],
	);

	if (
		(isError && !isValidRuleId) ||
		ruleId == null ||
		(ruleData === undefined && !isLoading)
	) {
		const errorMsg = apiError?.getErrorMessage() || '';
		return (
			<div className="edit-rules-container edit-rules-container--error">
				<Card size="small" className="edit-rules-card">
					<p className="content">{errorMsg || t('something_went_wrong')}</p>
					<div className="btn-container">
						<Button type="default" size="large" onClick={clickHandler}>
							Return to Alerts Page
						</Button>
					</div>
				</Card>
			</div>
		);
	}

	if (isLoading || isRefetching || !ruleData) {
		return <Spinner tip="Loading Rules..." />;
	}

	const initialAlert = fromRuleDTOToPostableRuleV2(ruleData);

	return (
		<div className="edit-rules-container">
			<EditAlertV2
				initialAlert={initialAlert}
				alertType={initialAlert.alertType}
			/>
		</div>
	);
}

export default EditRules;
