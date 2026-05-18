import { useCallback, useMemo } from 'react';
import { Button } from '@signozhq/ui/button';
import { toast } from '@signozhq/ui/sonner';
import { Tooltip } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Check, Loader, Send, X } from '@signozhq/icons';
import { useErrorModal } from 'providers/ErrorModalProvider';
import { toPostableRuleDTO } from 'types/api/alerts/convert';
import APIError from 'types/api/error';
import { isModifierKeyPressed } from 'utils/app';

import { useCreateAlertState } from '../context';
import {
	buildCreateThresholdAlertRulePayload,
	validateCreateAlertState,
} from './utils';

import './styles.scss';

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
	const { showErrorModal } = useErrorModal();

	const handleApiError = useCallback(
		(error: unknown): void => {
			showErrorModal(
				convertToApiError(error as AxiosError<RenderErrorResponseDTO>) as APIError,
			);
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
		const payload = buildCreateThresholdAlertRulePayload({
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
						toast.error(
							'No alerts found during the evaluation. This happens when rule condition is unsatisfied. You may adjust the rule threshold and retry.',
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
	]);

	const handleSaveAlert = useCallback((): void => {
		const payload = buildCreateThresholdAlertRulePayload({
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
	]);

	const disableButtons =
		isCreatingAlertRule || isTestingAlertRule || isUpdatingAlertRule;

	const saveAlertButton = useMemo(() => {
		let button = (
			<Button
				variant="solid"
				color="primary"
				onClick={handleSaveAlert}
				disabled={disableButtons || Boolean(alertValidationMessage)}
			>
				{isCreatingAlertRule || isUpdatingAlertRule ? (
					<Loader data-testid="save-alert-rule-loader-icon" size={14} />
				) : (
					<Check data-testid="save-alert-rule-check-icon" size={14} />
				)}
				Save Alert Rule
			</Button>
		);
		if (alertValidationMessage) {
			button = <Tooltip title={alertValidationMessage}>{button}</Tooltip>;
		}
		return button;
	}, [
		alertValidationMessage,
		disableButtons,
		handleSaveAlert,
		isCreatingAlertRule,
		isUpdatingAlertRule,
	]);

	const testAlertButton = useMemo(() => {
		let button = (
			<Button
				variant="solid"
				color="secondary"
				onClick={handleTestNotification}
				disabled={disableButtons || Boolean(alertValidationMessage)}
			>
				{isTestingAlertRule ? (
					<Loader data-testid="test-notification-loader-icon" size={14} />
				) : (
					<Send data-testid="test-notification-send-icon" size={14} />
				)}
				Test Notification
			</Button>
		);
		if (alertValidationMessage) {
			button = <Tooltip title={alertValidationMessage}>{button}</Tooltip>;
		}
		return button;
	}, [
		alertValidationMessage,
		disableButtons,
		handleTestNotification,
		isTestingAlertRule,
	]);

	return (
		<div className="create-alert-v2-footer">
			<Button
				variant="solid"
				color="secondary"
				onClick={handleDiscard}
				disabled={disableButtons}
			>
				<X size={14} /> Discard
			</Button>
			<div className="button-group">
				{testAlertButton}
				{saveAlertButton}
			</div>
		</div>
	);
}

export default Footer;
