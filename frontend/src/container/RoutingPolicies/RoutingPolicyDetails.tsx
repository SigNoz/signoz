import { useMemo } from 'react';
import { Button, Form, Input, Modal, Select } from 'antd';
import Flex from 'periscope/components/Flex/Flex';
import { Typography } from '@signozhq/ui/typography';
import ROUTES from 'constants/routes';
import { Check, Loader, X } from '@signozhq/icons';
import { useNotificationChannelCollectionPermissions } from 'hooks/notificationChannels/useNotificationChannelCollectionPermissions';
import AuthZTooltip from 'lib/authz/components/AuthZTooltip/AuthZTooltip';
import { openInNewTab } from 'utils/navigation';

import { INITIAL_ROUTING_POLICY_DETAILS_FORM_STATE } from './constants';
import {
	RoutingPolicyDetailsFormState,
	RoutingPolicyDetailsProps,
} from './types';
import { useRoutingPolicyFormPermissions } from './useRoutingPolicyFormPermissions';

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
	const [form] = Form.useForm();
	const { isReadOnly, saveChecks, getChannelDenial } =
		useRoutingPolicyFormPermissions(mode, routingPolicy, channels);
	const { canCreate: canCreateChannel } =
		useNotificationChannelCollectionPermissions();

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
				<Typography
					variant="paragraph"
					size="base"
					weight="regular"
					color="inherit"
					as="span"
					textOverflow="wrap"
				>
					No channels yet.
				</Typography>
				{canCreateChannel ? (
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						Create one
						<Button
							style={{ padding: '0 4px' }}
							type="link"
							onClick={(): void => {
								openInNewTab(ROUTES.CHANNELS_NEW);
							}}
						>
							here.
						</Button>
					</Typography>
				) : (
					<Typography
						variant="paragraph"
						size="base"
						weight="regular"
						color="inherit"
						as="span"
						textOverflow="wrap"
					>
						Please ask your admin to create one.
					</Typography>
				)}
			</Flex>
			<Button type="text" onClick={refreshChannels}>
				Refresh
			</Button>
		</Flex>
	);

	return (
		<Modal
			title={
				<Typography
					variant="label"
					size="large"
					weight="bold"
					color="inherit"
					as="h4"
					marginY={4}
					textOverflow="wrap"
				>
					{modalTitle}
				</Typography>
			}
			centered
			open
			className="create-policy-modal"
			width={600}
			onCancel={closeModal}
			footer={null}
			maskClosable={false}
		>
			<Form<RoutingPolicyDetailsFormState>
				form={form}
				initialValues={initialFormState}
				disabled={isReadOnly}
				onFinish={handleSave}
			>
				<div className="create-policy-container">
					<div className="input-group">
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Routing Policy Name
						</Typography>
						<Form.Item
							name="name"
							rules={[
								{
									required: true,
									message: 'Please provide a name for the routing policy',
								},
							]}
						>
							<Input
								placeholder="e.g. Base routing policy..."
								data-testid="routing-policy-name-input"
							/>
						</Form.Item>
					</div>
					<div className="input-group">
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Description
						</Typography>
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
								data-testid="routing-policy-description-input"
								autoSize={{ minRows: 1, maxRows: 6 }}
								style={{ resize: 'none' }}
							/>
						</Form.Item>
					</div>
					<div className="input-group">
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Expression
						</Typography>
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
								data-testid="routing-policy-expression-input"
								autoSize={{ minRows: 1, maxRows: 6 }}
								style={{ resize: 'none' }}
							/>
						</Form.Item>
					</div>
					<div className="input-group">
						<Typography
							variant="paragraph"
							size="base"
							weight="regular"
							color="inherit"
							as="span"
							textOverflow="wrap"
						>
							Notification Channels
						</Typography>
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
								options={channels.map((channel) => {
									const denial = getChannelDenial(channel);
									return {
										value: channel.name,
										label: channel.name,
										disabled: !!denial,
										title: denial,
									};
								})}
								mode="multiple"
								placeholder="Select notification channels"
								aria-label="Notification Channels"
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
								data-testid="routing-policy-channels-select"
							/>
						</Form.Item>
					</div>
				</div>
				<Flex className="create-policy-footer" justify="space-between">
					<Button
						icon={<X size={16} />}
						onClick={closeModal}
						disabled={isPolicyDetailsModalActionLoading}
						data-testid="routing-policy-cancel"
					>
						Cancel
					</Button>
					<AuthZTooltip checks={saveChecks}>
						<Button
							icon={saveButtonIcon}
							type="primary"
							htmlType="submit"
							loading={isPolicyDetailsModalActionLoading}
							disabled={isPolicyDetailsModalActionLoading}
							data-testid="routing-policy-save"
						>
							Save Routing Policy
						</Button>
					</AuthZTooltip>
				</Flex>
			</Form>
		</Modal>
	);
}

export default RoutingPolicyDetails;
