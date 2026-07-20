import { Dispatch, SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchPath, useLocation } from 'react-router-dom';
import { Button, Form, Input, Select, Space } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';
import ROUTES from 'constants/routes';

import { JsmOpsChannel } from '../../../CreateAlertChannels/config';
import { useAtlassianConnect } from '../Atlassian/useAtlassianConnect';
import { useAtlassianConnections } from '../Atlassian/useAtlassianConnections';
import { useJsmOpsTeams } from './useJsmOpsTeams';

const { TextArea } = Input;

// Responders are stored as a comma-separated string of team ids
function splitResponders(value?: string): string[] {
	return value
		? value
				.split(',')
				.map((id) => id.trim())
				.filter((id) => id)
		: [];
}

function JsmOps({ setSelectedConfig }: JsmOpsProps): JSX.Element {
	const { t } = useTranslation('channels');
	const form = Form.useFormInstance();

	const savedConnectionId: string | undefined =
		form.getFieldValue('connection_id');
	const savedResponders: string | undefined = form.getFieldValue('responders');

	const [connectionId, setConnectionId] = useState<string | undefined>(
		savedConnectionId,
	);
	const [responders, setResponders] = useState<string[]>(
		splitResponders(savedResponders),
	);

	const { pathname } = useLocation();
	const channelId = matchPath<{ channelId: string }>(pathname, {
		path: ROUTES.CHANNELS_EDIT,
	})?.params?.channelId;

	const {
		connections,
		isLoading: connectionsLoading,
		refetch: refetchConnections,
	} = useAtlassianConnections();

	const { connect, isConnecting } = useAtlassianConnect((connection) => {
		setConnectionId(connection.id);
		setSelectedConfig((value) => ({
			...value,
			connection_id: connection.id,
		}));
		void refetchConnections();
	});

	const {
		teams,
		isLoading: teamsLoading,
		isError: teamsError,
	} = useJsmOpsTeams({
		connectionId,
		channelId,
		enabled: Boolean(connectionId),
	});

	const handleInputChange =
		(field: string) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
			setSelectedConfig((value) => ({
				...value,
				[field]: event.target.value,
			}));
		};

	const handleConnectionChange = (id: string): void => {
		setConnectionId(id);
		setSelectedConfig((value) => ({
			...value,
			connection_id: id,
		}));
	};

	const handleRespondersChange = (ids: string[]): void => {
		setResponders(ids);
		setSelectedConfig((value) => ({
			...value,
			responders: ids.join(', '),
		}));
	};

	return (
		<>
			<Form.Item
				label={t('field_jsmops_oauth')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_oauth')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
				required
			>
				<Space direction="vertical" style={{ width: '100%' }}>
					<Select
						value={connectionId}
						onChange={handleConnectionChange}
						options={connections.map((connection) => ({
							label: connection.site_url || connection.cloud_id,
							value: connection.id,
						}))}
						loading={connectionsLoading}
						placeholder={t('placeholder_atlassian_connection')}
						optionFilterProp="label"
						showSearch
						data-testid="jsmops-connection-select"
					/>
					<Button
						type={connectionId ? 'default' : 'primary'}
						onClick={(): void => {
							void connect();
						}}
						loading={isConnecting}
						data-testid="jsmops-oauth-connect"
					>
						{t('button_add_atlassian_connection')}
					</Button>
				</Space>
			</Form.Item>

			<Form.Item
				label={t('field_jsmops_responders')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_responders')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Select
					mode="multiple"
					value={responders}
					onChange={handleRespondersChange}
					options={teams.map((team) => ({
						label: team.name,
						value: team.id,
					}))}
					loading={teamsLoading}
					disabled={!connectionId}
					optionFilterProp="label"
					placeholder={
						teamsError
							? t('jsmops_teams_load_failed')
							: t('placeholder_jsmops_responders')
					}
					notFoundContent={teamsError ? t('jsmops_teams_load_failed') : undefined}
					data-testid="jsmops-responders-select"
				/>
			</Form.Item>

			<Form.Item name="message" label={t('field_jsmops_message')} required>
				<TextArea
					rows={2}
					onChange={handleInputChange('message')}
					data-testid="jsmops-message-textarea"
					placeholder={`[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .CommonLabels.alertname }}`}
				/>
			</Form.Item>

			<Form.Item name="description" label={t('field_jsmops_description')}>
				<TextArea
					rows={4}
					onChange={handleInputChange('description')}
					data-testid="jsmops-description-textarea"
					placeholder={t('placeholder_jsmops_description')}
				/>
			</Form.Item>

			<Form.Item
				name="tags"
				label={t('field_jsmops_tags')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_tags')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					onChange={handleInputChange('tags')}
					data-testid="jsmops-tags-textbox"
					placeholder="tag1, tag2, tag3"
				/>
			</Form.Item>

			<Form.Item
				name="priority"
				label={t('field_jsmops_priority')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_jsmops_priority')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<TextArea
					rows={2}
					onChange={handleInputChange('priority')}
					data-testid="jsmops-priority-textarea"
				/>
			</Form.Item>
		</>
	);
}

interface JsmOpsProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<JsmOpsChannel>>>;
}

export default JsmOps;
