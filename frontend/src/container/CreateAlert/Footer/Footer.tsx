import { useCallback, useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/toast';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Check, Send, X } from '@signozhq/icons';
import AuthZButton from 'lib/authz/components/AuthZButton/AuthZButton';
import { AUTHZ_LOADING_TOOLTIP } from 'lib/authz/components/constants';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { toPostableRuleDTO } from 'types/api/alerts/convert';
import APIError from 'types/api/error';
import { isModifierKeyPressed } from 'utils/app';

import { useCreateAlertState } from '../context';
import { WAIT_FOR_SAVE, WAIT_FOR_TEST_NOTIFICATION } from './constants';
import { useAlertRuleSaveChecks } from './useAlertRuleSaveChecks';
import { buildCreateAlertRulePayload, validateCreateAlertState } from './utils';

import './styles.scss';
import {
	invalidateGetRuleByID,
	invalidateListRulesV3,
} from 'api/generated/services/rules';
import { useQueryClient } from 'react-query';

function Footer(): JSX.Element {
	const {
		alertType,
		alertState: basicAlertState,
		thresholdState,
		advancedOptions,
		evaluationWindow,
		notificationSettings,
		discardAlertRule,
		createAlertRule,
		isCreatingAlertRule,
		testAlertRule,
		isTestingAlertRule,
		updateAlertRule,
		isUpdatingAlertRule,
		isEditMode,
		ruleId,
	} = useCreateAlertState();
	const { currentQuery } = useQueryBuilder();
	const { safeNavigate } = useSafeNavigate();
	const { saveChecks, testChecks, isResolvingChannels } =
		useAlertRuleSaveChecks();
	const { showErrorModal } = useErrorModal();

	const handleApiError = useCallback(
		(error: AxiosError<RenderErrorResponseDTO>): void => {
			showErrorModal(convertToApiError(error) as APIError);
		},
		[showErrorModal],
	);

	const handleDiscard = (e: React.MouseEvent): void => {
		discardAlertRule();
		safeNavigate('/alerts', { newTab: isModifierKeyPressed(e) });
	};

	const alertValidationMessage = useMemo(
		() =>
			validateCreateAlertState({
				alertType,
				basicAlertState,
				thresholdState,
				advancedOptions,
				evaluationWindow,
				notificationSettings,
				query: currentQuery,
			}),
		[
			alertType,
			basicAlertState,
			thresholdState,
			advancedOptions,
			evaluationWindow,
			notificationSettings,
			currentQuery,
		],
	);

	const handleTestNotification = useCallback((): void => {
		const payload = buildCreateAlertRulePayload({
			alertType,
			basicAlertState,
			thresholdState,
			advancedOptions,
			evaluationWindow,
			notificationSettings,
			query: currentQuery,
		});
		testAlertRule(
			{ data: toPostableRuleDTO(payload) },
			{
				onSuccess: (response) => {
					if (response.data?.alertCount === 0) {
						toast.danger(
							'No alerts found during the evaluation. This happens when rule condition is unsatisfied. You may adjust the rule threshold and retry.',
							{ action: { label: 'Dismiss' } },
						);
						return;
					}
					toast.success('Test notification sent successfully');
				},
				onError: handleApiError,
			},
		);
	}, [
		alertType,
		basicAlertState,
		thresholdState,
		advancedOptions,
		evaluationWindow,
		notificationSettings,
		currentQuery,
		testAlertRule,
		handleApiError,
	]);

	const queryClient = useQueryClient();
	const handleSaveAlert = useCallback((): void => {
		const payload = buildCreateAlertRulePayload({
			alertType,
			basicAlertState,
			thresholdState,
			advancedOptions,
			evaluationWindow,
			notificationSettings,
			query: currentQuery,
		});
		if (isEditMode) {
			updateAlertRule(
				{
					pathParams: { id: ruleId },
					data: toPostableRuleDTO(payload),
				},
				{
					onSuccess: () => {
						void invalidateGetRuleByID(queryClient, { id: ruleId });
						void invalidateListRulesV3(queryClient);

						toast.success('Alert rule updated successfully');
						safeNavigate('/alerts');
					},
					onError: handleApiError,
				},
			);
		} else {
			createAlertRule(
				{ data: toPostableRuleDTO(payload) },
				{
					onSuccess: () => {
						toast.success('Alert rule created successfully');
						safeNavigate('/alerts');
					},
					onError: handleApiError,
				},
			);
		}
	}, [
		alertType,
		basicAlertState,
		thresholdState,
		advancedOptions,
		evaluationWindow,
		notificationSettings,
		currentQuery,
		isEditMode,
		ruleId,
		updateAlertRule,
		createAlertRule,
		safeNavigate,
		handleApiError,
		queryClient,
	]);

	const isSavingAlertRule = isCreatingAlertRule || isUpdatingAlertRule;
	const disableButtons = isSavingAlertRule || isTestingAlertRule;

	const saveBlockedReason =
		alertValidationMessage ||
		(isTestingAlertRule
			? WAIT_FOR_TEST_NOTIFICATION
			: isResolvingChannels
				? AUTHZ_LOADING_TOOLTIP
				: undefined);
	const testBlockedReason =
		alertValidationMessage ||
		(isSavingAlertRule
			? WAIT_FOR_SAVE
			: isResolvingChannels
				? AUTHZ_LOADING_TOOLTIP
				: undefined);

	const saveAlertButton = useMemo(
		() => (
			<AuthZButton
				checks={saveChecks}
				disabledTooltip={saveBlockedReason}
				size="md"
				variant="solid"
				color="primary"
				onClick={handleSaveAlert}
				loading={isSavingAlertRule}
				prefix={<Check data-testid="save-alert-rule-check-icon" size={14} />}
				testId="save-alert-rule-button"
			>
				Save Alert Rule
			</AuthZButton>
		),
		[saveChecks, saveBlockedReason, handleSaveAlert, isSavingAlertRule],
	);

	const testAlertButton = useMemo(
		() => (
			<AuthZButton
				checks={testChecks}
				disabledTooltip={testBlockedReason}
				size="md"
				variant="solid"
				color="secondary"
				onClick={handleTestNotification}
				loading={isTestingAlertRule}
				prefix={<Send data-testid="test-notification-send-icon" size={14} />}
				testId="test-notification-button"
			>
				Test Notification
			</AuthZButton>
		),
		[testChecks, testBlockedReason, handleTestNotification, isTestingAlertRule],
	);

	return (
		<div className="create-alert-v2-footer">
			<Button
				disabledTooltip={
					isTestingAlertRule ? WAIT_FOR_TEST_NOTIFICATION : WAIT_FOR_SAVE
				}
				size="md"
				variant="solid"
				color="secondary"
				onClick={handleDiscard}
				disabled={disableButtons}
				testId="discard-alert-rule-button"
				prefix={<X size={14} />}
			>
				Discard
			</Button>
			<div className="button-group">
				{testAlertButton}
				{saveAlertButton}
			</div>
		</div>
	);
}

export default Footer;
