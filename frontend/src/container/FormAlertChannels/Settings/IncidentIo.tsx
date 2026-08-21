import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';
import { Typography } from '@signozhq/ui/typography';

import { IncidentIOChannel } from '../../CreateAlertChannels/config';

function IncidentIOSettings({
	setSelectedConfig,
}: IncidentIOProps): JSX.Element {
	const { t } = useTranslation('channels');

	const update = (patch: Partial<IncidentIOChannel>): void =>
		setSelectedConfig((value) => ({ ...value, ...patch }));

	return (
		<>
			<Typography.Text
				color="muted"
				size="sm"
				testId="incidentio-tip"
				style={{ display: 'block', marginBottom: 16 }}
			>
				{t('incidentio_tip')}{' '}
				<Typography.Link
					href="https://signoz.io/docs/alerts-management/notification-channel/incidentio/"
					target="_blank"
					rel="noopener noreferrer"
				>
					{t('incidentio_tip_link')}
				</Typography.Link>
			</Typography.Text>

			<Form.Item
				name="url"
				label={t('field_incidentio_url')}
				help={t('help_incidentio_url')}
				required
			>
				<Input
					onChange={(event): void => update({ url: event.target.value })}
					data-testid="incidentio-url-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="token"
				label={t('field_incidentio_token')}
				help={t('help_incidentio_token')}
				required
			>
				<Input
					type="password"
					onChange={(event): void => update({ token: event.target.value })}
					data-testid="incidentio-token-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="title"
				label={t('field_incidentio_title')}
				help={t('help_incidentio_title')}
			>
				<Input.TextArea
					rows={2}
					onChange={(event): void => update({ title: event.target.value })}
					data-testid="incidentio-title-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="description"
				label={t('field_incidentio_description')}
				help={t('help_incidentio_description')}
			>
				<Input.TextArea
					rows={6}
					onChange={(event): void => update({ description: event.target.value })}
					data-testid="incidentio-description-textarea"
				/>
			</Form.Item>
		</>
	);
}

interface IncidentIOProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<IncidentIOChannel>>>;
}

export default IncidentIOSettings;
