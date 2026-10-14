import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Form, Input } from 'antd';
import { MarkdownRenderer } from 'components/MarkdownRenderer/MarkdownRenderer';

import { ChannelSpecFormValues } from '../../CreateAlertChannels/types';
import PagerDetails from './PagerDetails';

const { TextArea } = Input;

function PagerForm({
	setSelectedConfig,
	initialDetails,
}: PagerFormProps): JSX.Element {
	const { t } = useTranslation('channels');
	return (
		<>
			<Form.Item
				name="routingKey"
				label={t('field_pager_routing_key')}
				tooltip={{
					title: (
						<MarkdownRenderer
							markdownContent={t('tooltip_pager_routing_key')}
							variables={{}}
						/>
					),
					overlayInnerStyle: { maxWidth: 400 },
					placement: 'right',
				}}
			>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							routingKey: event.target.value,
						}));
					}}
					data-testid="pager-routing-key-textbox"
				/>
			</Form.Item>

			<Form.Item
				name="description"
				help={t('help_pager_description')}
				label={t('field_pager_description')}
				required
			>
				<TextArea
					rows={4}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							description: event.target.value,
						}))
					}
					placeholder={t('placeholder_pager_description')}
					data-testid="pager-description-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="severity"
				help={t('help_pager_severity')}
				label={t('field_pager_severity')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							severity: event.target.value,
						}))
					}
					data-testid="pager-severity-textbox"
				/>
			</Form.Item>

			<PagerDetails
				setSelectedConfig={setSelectedConfig}
				initialDetails={initialDetails}
			/>

			<Form.Item
				name="component"
				help={t('help_pager_component')}
				label={t('field_pager_component')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							component: event.target.value,
						}))
					}
				/>
			</Form.Item>

			<Form.Item
				name="group"
				help={t('help_pager_group')}
				label={t('field_pager_group')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							group: event.target.value,
						}))
					}
					data-testid="pager-group-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="class"
				help={t('help_pager_class')}
				label={t('field_pager_class')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							class: event.target.value,
						}))
					}
					data-testid="pager-class-textarea"
				/>
			</Form.Item>
			<Form.Item
				name="client"
				help={t('help_pager_client')}
				label={t('field_pager_client')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							client: event.target.value,
						}))
					}
					data-testid="pager-client-textarea"
				/>
			</Form.Item>

			<Form.Item
				name="clientUrl"
				help={t('help_pager_client_url')}
				label={t('field_pager_client_url')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							clientUrl: event.target.value,
						}))
					}
					data-testid="pager-client-url-textarea"
				/>
			</Form.Item>
		</>
	);
}

interface PagerFormProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<ChannelSpecFormValues>>>;
	initialDetails?: Record<string, string>;
}

export default PagerForm;
