import { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, FormProvider, UseFormReturn } from 'react-hook-form';
import { Input } from '@signozhq/ui/input';
import { SelectSimple } from '@signozhq/ui/select';
import { Switch } from '@signozhq/ui/switch';
import {
	ChannelFormValues,
	ChannelKind,
} from 'container/CreateAlertChannels/types';

import EmailSettings from './Settings/Email';
import GoogleChatSettings from './Settings/GoogleChat';
import IncidentIOSettings from './Settings/IncidentIo';
import JiraSettings from './Settings/Jira';
import JsmOpsSettings from './Settings/JsmOps';
import MsTeamsSettings from './Settings/MsTeams';
import OpsgenieSettings from './Settings/Opsgenie';
import PagerSettings from './Settings/Pager';
import SlackSettings from './Settings/Slack';
import WebhookSettings from './Settings/Webhook';
import { Button } from '@signozhq/ui/button';

import FormCard from './FormCard';
import FormField from './FormField';
import styles from './FormAlertChannels.module.scss';

const CHANNEL_TYPE_OPTIONS = [
	{ value: ChannelKind.slack, label: 'Slack' },
	{ value: ChannelKind.webhook, label: 'Webhook' },
	{ value: ChannelKind.pagerduty, label: 'Pagerduty' },
	{ value: ChannelKind.opsgenie, label: 'Opsgenie' },
	{ value: ChannelKind.email, label: 'Email' },
	{ value: ChannelKind.msteams, label: 'Microsoft Teams' },
	{ value: ChannelKind.googlechat, label: 'Google Chat' },
	{ value: ChannelKind.jira, label: 'Jira' },
	{ value: ChannelKind.jsmops, label: 'Jira Service Management Ops' },
	{ value: ChannelKind.incidentio, label: 'incident.io' },
];

function FormAlertChannels({
	form,
	type,
	onTypeChangeHandler,
	onTestHandler,
	onSaveHandler,
	savingState,
	testingState,
	editing = false,
}: FormAlertChannelsProps): JSX.Element {
	const { t } = useTranslation('channels');
	const {
		register,
		control,
		formState: { errors },
	} = form;

	const renderSettings = (): ReactElement | null => {
		switch (type) {
			case ChannelKind.slack:
				return <SlackSettings />;
			case ChannelKind.webhook:
				return <WebhookSettings />;
			case ChannelKind.pagerduty:
				return <PagerSettings />;
			case ChannelKind.msteams:
				return <MsTeamsSettings />;
			case ChannelKind.googlechat:
				return <GoogleChatSettings />;
			case ChannelKind.jira:
				return <JiraSettings />;
			case ChannelKind.jsmops:
				return <JsmOpsSettings />;
			case ChannelKind.incidentio:
				return <IncidentIOSettings />;
			case ChannelKind.opsgenie:
				return <OpsgenieSettings />;
			case ChannelKind.email:
				return <EmailSettings />;
			default:
				return null;
		}
	};

	return (
		<FormProvider {...form}>
			<form className={styles.form}>
				<div className={styles.cards}>
					<FormCard title={t('section_general')}>
						<FormField
							label={t('field_channel_name')}
							help={editing ? t('help_channel_name_immutable') : undefined}
							error={errors.name?.message}
							htmlFor="channel-name"
							required
						>
							<Input
								id="channel-name"
								data-testid="channel-name-textbox"
								disabled={editing}
								aria-required
								{...register('name')}
							/>
						</FormField>

						<FormField label={t('field_send_resolved')}>
							<Controller
								control={control}
								name="sendResolved"
								render={({ field }): JSX.Element => (
									<Switch
										color="primary"
										textPlacement="right"
										testId="field-send-resolved-checkbox"
										value={!!field.value}
										onChange={field.onChange}
									/>
								)}
							/>
						</FormField>

						<FormField label={t('field_channel_type')} htmlFor="channel-type">
							<SelectSimple
								id="channel-type"
								items={CHANNEL_TYPE_OPTIONS}
								value={type}
								disabled={editing}
								onChange={(value): void => onTypeChangeHandler(value as ChannelKind)}
								testId="channel-type-select"
							/>
						</FormField>
					</FormCard>

					{renderSettings()}
				</div>

				<div className={styles.actions}>
					<Button
						variant="solid"
						color="primary"
						size="md"
						testId="save-channel-button"
						loading={savingState}
						onClick={onSaveHandler}
					>
						{t('button_save_channel')}
					</Button>
					<Button
						variant="outlined"
						color="secondary"
						size="md"
						testId="test-channel-button"
						loading={testingState}
						onClick={onTestHandler}
					>
						{t('button_test_channel')}
					</Button>
				</div>
			</form>
		</FormProvider>
	);
}

interface FormAlertChannelsProps {
	form: UseFormReturn<ChannelFormValues>;
	type: ChannelKind;
	onTypeChangeHandler: (value: ChannelKind) => void;
	onSaveHandler: () => void;
	onTestHandler: () => void;
	testingState: boolean;
	savingState: boolean;
	// editing indicates if the form is opened in edit mode
	editing?: boolean;
}

FormAlertChannels.defaultProps = {
	editing: undefined,
};

export default FormAlertChannels;
