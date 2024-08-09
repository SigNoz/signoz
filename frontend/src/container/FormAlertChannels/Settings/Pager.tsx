import { Form, Input } from 'antd';
import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';

import { PagerChannel } from '../../CreateAlertChannels/config';

const { TextArea } = Input;

function PagerForm({ setSelectedConfig }: PagerFormProps): JSX.Element {
	const { t } = useTranslation('channels');
	return (
		<>
			<Form.Item name="routing_key" label={t('field_pager_routing_key')} required>
				<Input
					onChange={(event): void => {
						setSelectedConfig((value) => ({
							...value,
							routing_key: event.target.value,
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

			<Form.Item
				name="details"
				help={t('help_pager_details')}
				label={t('field_pager_details')}
			>
				<TextArea
					rows={4}
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							details: event.target.value,
						}))
					}
					data-testid="pager-additional-details-textarea"
				/>
			</Form.Item>

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
				name="client_url"
				help={t('help_pager_client_url')}
				label={t('field_pager_client_url')}
			>
				<Input
					onChange={(event): void =>
						setSelectedConfig((value) => ({
							...value,
							client_url: event.target.value,
						}))
					}
					data-testid="pager-client-url-textarea"
				/>
			</Form.Item>
		</>
	);
}

interface PagerFormProps {
	setSelectedConfig: Dispatch<SetStateAction<Partial<PagerChannel>>>;
}

export default PagerForm;
