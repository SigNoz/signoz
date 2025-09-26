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
import { ModalTitle } from 'container/PipelinePage/PipelineListsView/styles';
import { useAppContext } from 'providers/App/App';
import { useMemo, useReducer } from 'react';

import { INITIAL_CREATE_ROUTING_POLICY_STATE } from './constants';
import { CreateRoutingPolicyProps } from './types';
import { createRoutingPolicyReducer } from './utils';

function CreateRoutingPolicy({
	closeModal,
	mode,
	channels,
	routingPolicy,
	handlePolicyDetailsModalAction,
	isPolicyDetailsModalActionLoading,
}: CreateRoutingPolicyProps): JSX.Element {
	const { user } = useAppContext();
	const [form] = useForm();

	const initialReducerState = useMemo(() => {
		if (mode === 'edit') {
			return {
				name: routingPolicy?.name || '',
				expression: routingPolicy?.expression || '',
				channels: routingPolicy?.channels || [],
			};
		}
		return INITIAL_CREATE_ROUTING_POLICY_STATE;
	}, [routingPolicy, mode]);

	const [createRoutingPolicyState, createRoutingPolicyDispatch] = useReducer(
		createRoutingPolicyReducer,
		initialReducerState,
	);

	const modalTitle =
		mode === 'edit' ? 'Edit routing policy' : 'Create routing policy';

	const handleSave = (): void => {
		handlePolicyDetailsModalAction(mode, {
			name: createRoutingPolicyState.name,
			expression: createRoutingPolicyState.expression,
			channels: createRoutingPolicyState.channels,
			userEmail: user.email,
		});
	};
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
			<Form form={form} onFinish={handleSave}>
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
							initialValue={createRoutingPolicyState.name}
						>
							<Input
								placeholder="e.g. Base routing policy..."
								value={createRoutingPolicyState.name}
								onChange={(e): void =>
									createRoutingPolicyDispatch({
										type: 'SET_NAME',
										payload: e.target.value,
									})
								}
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
							initialValue={createRoutingPolicyState.expression}
						>
							<Input.TextArea
								placeholder="e.g. http.status_code >= 500 AND service.name = 'frontend'"
								value={createRoutingPolicyState.expression}
								onChange={(e): void =>
									createRoutingPolicyDispatch({
										type: 'SET_EXPRESSION',
										payload: e.target.value,
									})
								}
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
							initialValue={createRoutingPolicyState.channels}
						>
							<Select
								value={createRoutingPolicyState.channels}
								onChange={(value): void =>
									createRoutingPolicyDispatch({ type: 'SET_CHANNELS', payload: value })
								}
								options={channels.map((channel) => ({
									value: channel.id,
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
							/>
						</Form.Item>
					</div>
				</div>
				<Flex className="create-policy-footer" justify="space-between">
					<Button onClick={closeModal} disabled={isPolicyDetailsModalActionLoading}>
						Cancel
					</Button>
					<Button
						type="primary"
						htmlType="submit"
						loading={isPolicyDetailsModalActionLoading}
						disabled={isPolicyDetailsModalActionLoading}
						onClick={handleSave}
					>
						Save Routing Policy
					</Button>
				</Flex>
			</Form>
		</Modal>
	);
}

export default CreateRoutingPolicy;
