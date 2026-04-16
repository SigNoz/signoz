import { useCallback, useMemo } from 'react';
import { toast } from '@signozhq/ui';
import { Button, Tooltip, Typography } from 'antd';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type {
	RenderErrorResponseDTO,
	RuletypesPostableRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import { AxiosError } from 'axios';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import { Check, Loader, Send, X } from 'lucide-react';
import { useErrorModal } from 'providers/ErrorModalProvider';
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
			{ data: (payload as unknown) as RuletypesPostableRuleDTO },
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
				onError: (error) => {
					showErrorModal(
						convertToApiError(
							error as AxiosError<RenderErrorResponseDTO>,
						) as APIError,
					);
				},
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
					data: (payload as unknown) as RuletypesPostableRuleDTO,
				},
				{
					onSuccess: () => {
						toast.success('Alert rule updated successfully');
						safeNavigate('/alerts');
					},
					onError: (error) => {
						toast.error(error.message);
					},
				},
			);
		} else {
			createAlertRule(
				{ data: (payload as unknown) as RuletypesPostableRuleDTO },
				{
					onSuccess: () => {
						toast.success('Alert rule created successfully');
						safeNavigate('/alerts');
					},
					onError: (error) => {
						toast.error(error.message);
					},
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
		showErrorModal,
	]);

	const disableButtons =
		isCreatingAlertRule || isTestingAlertRule || isUpdatingAlertRule;

	const saveAlertButton = useMemo(() => {
		let button = (
			<Button
				type="primary"
				onClick={handleSaveAlert}
				disabled={disableButtons || Boolean(alertValidationMessage)}
			>
				{isCreatingAlertRule || isUpdatingAlertRule ? (
					<Loader size={14} />
				) : (
					<Check size={14} />
				)}
				<Typography.Text>Save Alert Rule</Typography.Text>
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
				type="default"
				onClick={handleTestNotification}
				disabled={disableButtons || Boolean(alertValidationMessage)}
			>
				{isTestingAlertRule ? <Loader size={14} /> : <Send size={14} />}
				<Typography.Text>Test Notification</Typography.Text>
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
			<Button type="default" onClick={handleDiscard} disabled={disableButtons}>
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
