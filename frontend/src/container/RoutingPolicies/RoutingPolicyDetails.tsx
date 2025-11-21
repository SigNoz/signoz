import {
	Button,
	Divider,
	Flex,
	Form,
	Input,
	Modal,
	Select,
	Typography,
} from 'antd';
import { useForm } from 'antd/lib/form/Form';
import ROUTES from 'constants/routes';
import { ModalTitle } from 'container/PipelinePage/PipelineListsView/styles';
import { Check, Loader, X } from 'lucide-react';
import { useAppContext } from 'providers/App/App';
import { useMemo } from 'react';
import { USER_ROLES } from 'types/roles';

import { INITIAL_ROUTING_POLICY_DETAILS_FORM_STATE } from './constants';
import {
	RoutingPolicyDetailsFormState,
	RoutingPolicyDetailsProps,
} from './types';

function RoutingPolicyDetails({
	closeModal,
	mode,
	channels,
	isErrorChannels,
	isLoadingChannels,
	routingPolicy,
	handlePolicyDetailsModalAction,
	isPolicyDetailsModalActionLoading,
	refreshChannels,
}: RoutingPolicyDetailsProps): JSX.Element {
	const [form] = useForm();
	const { user } = useAppContext();

	const initialFormState = useMemo(() => {
		if (mode === 'edit') {
			return {
				name: routingPolicy?.name || '',
				expression: routingPolicy?.expression || '',
				channels: routingPolicy?.channels || [],
				description: routingPolicy?.description || '',
			};
		}
		return INITIAL_ROUTING_POLICY_DETAILS_FORM_STATE;
	}, [routingPolicy, mode]);

	const saveButtonIcon = isPolicyDetailsModalActionLoading ? (
		<Loader size={16} />
	) : (
		<Check size={16} />
	);

	const modalTitle =
		mode === 'edit' ? 'Edit routing policy' : 'Create routing policy';

	const handleSave = (): void => {
		handlePolicyDetailsModalAction(mode, {
			name: form.getFieldValue('name'),
			expression: form.getFieldValue('expression'),
			channels: form.getFieldValue('channels'),
			description: form.getFieldValue('description'),
		});
	};

	const notificationChannelsNotFoundContent = (
		<Flex justify="space-between">
			<Flex gap={4} align="center">
				<Typography.Text>No channels yet.</Typography.Text>
				{user?.role === USER_ROLES.ADMIN ? (
					<Typography.Text>
						Create one
						<Button
							style={{ padding: '0 4px' }}
							type="link"
							onClick={(): void => {
								window.open(ROUTES.CHANNELS_NEW, '_blank');
							}}
						>
							here.
						</Button>
					</Typography.Text>
				) : (
					<Typography.Text>Please ask your admin to create one.</Typography.Text>
				)}
			</Flex>
			<Button type="text" onClick={refreshChannels}>
				Refresh
			</Button>
		</Flex>
	);

	return (
		<Modal
			title={<ModalTitle level={4}>{modalTitle}</ModalTitle>}
			centered
			open
			className="create-policy-modal"
			width={600}
			onCancel={closeModal}
			footer={null}
			maskClosable={false}
		>
			<Divider plain />
			<Form<RoutingPolicyDetailsFormState>
				form={form}
				initialValues={initialFormState}
				onFinish={handleSave}
			>
				<div className="create-policy-container">
					<div className="input-group">
						<Typography.Text>Routing Policy Name</Typography.Text>
						<Form.Item
							name="name"
							rules={[
								{
									required: true,
									message: 'Please provide a name for the routing policy',
								},
							]}
						>
							<Input placeholder="e.g. Base routing policy..." />
						</Form.Item>
					</div>
					<div className="input-group">
						<Typography.Text>Description</Typography.Text>
						<Form.Item
							name="description"
							rules={[
								{
									required: false,
								},
							]}
						>
							<Input.TextArea
								placeholder="e.g. This is a routing policy that..."
								autoSize={{ minRows: 1, maxRows: 6 }}
								style={{ resize: 'none' }}
							/>
						</Form.Item>
					</div>
					<div className="input-group">
						<Typography.Text>Expression</Typography.Text>
						<Form.Item
							name="expression"
							rules={[
								{
									required: true,
									message: 'Please provide an expression for the routing policy',
								},
							]}
						>
							<Input.TextArea
								placeholder='e.g. service.name == "payment" && threshold.name == "critical"'
								autoSize={{ minRows: 1, maxRows: 6 }}
								style={{ resize: 'none' }}
							/>
						</Form.Item>
					</div>
					<div className="input-group">
						<Typography.Text>Notification Channels</Typography.Text>
						<Form.Item
							name="channels"
							rules={[
								{
									required: true,
									message: 'Please select at least one notification channel',
								},
							]}
						>
							<Select
								options={channels.map((channel) => ({
									value: channel.name,
									label: channel.name,
								}))}
								mode="multiple"
								placeholder="Select notification channels"
								showSearch
								maxTagCount={3}
								maxTagPlaceholder={(omittedValues): string =>
									`+${omittedValues.length} more`
								}
								maxTagTextLength={10}
								filterOption={(input, option): boolean =>
									option?.label?.toLowerCase().includes(input.toLowerCase()) || false
								}
								status={isErrorChannels ? 'error' : undefined}
								disabled={isLoadingChannels}
								notFoundContent={notificationChannelsNotFoundContent}
							/>
						</Form.Item>
					</div>
				</div>
				<Flex className="create-policy-footer" justify="space-between">
					<Button
						icon={<X size={16} />}
						onClick={closeModal}
						disabled={isPolicyDetailsModalActionLoading}
					>
						Cancel
					</Button>
					<Button
						icon={saveButtonIcon}
						type="primary"
						htmlType="submit"
						loading={isPolicyDetailsModalActionLoading}
						disabled={isPolicyDetailsModalActionLoading}
					>
						Save Routing Policy
					</Button>
				</Flex>
			</Form>
		</Modal>
	);
}

export default RoutingPolicyDetails;
