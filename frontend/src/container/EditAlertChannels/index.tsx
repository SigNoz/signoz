import { Form, notification } from 'antd';
import editSlackApi from 'api/channels/editSlack';
import ROUTES from 'constants/routes';
import {
	ChannelType,
	SlackChannel,
} from 'container/CreateAlertChannels/config';
import FormAlertChannels from 'container/FormAlertChannels';
import history from 'lib/history';
import { Store } from 'rc-field-form/lib/interface';
import React, { useCallback, useState } from 'react';
import { connect } from 'react-redux';
import { useParams } from 'react-router';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { ToggleSettingsTab } from 'store/actions';
import AppActions from 'types/actions';
import { SettingTab } from 'types/reducer/app';

const EditAlertChannels = ({
	initialValue,
	toggleSettingsTab,
}: EditAlertChannelsProps): JSX.Element => {
	const [formInstance] = Form.useForm();
	const [selectedConfig, setSelectedConfig] = useState<Partial<SlackChannel>>({
		...initialValue,
	});
	const [savingState, setSavingState] = useState<boolean>(false);
	const [notifications, NotificationElement] = notification.useNotification();
	const { id } = useParams<{ id: string }>();

	const [type, setType] = useState<ChannelType>('slack');

	const onTypeChangeHandler = useCallback((value: string) => {
		setType(value as ChannelType);
	}, []);

	const onSlackEditHandler = useCallback(async () => {
		setSavingState(true);
		const response = await editSlackApi({
			api_url: selectedConfig?.api_url || '',
			channel: selectedConfig?.channel || '',
			name: selectedConfig?.name || '',
			send_resolved: true,
			text: selectedConfig?.text || '',
			title: selectedConfig?.title || '',
			id,
		});

		if (response.statusCode === 200) {
			notifications.success({
				message: 'Success',
				description: 'Channels Edited Successfully',
			});
			toggleSettingsTab('Alert Channels');

			setTimeout(() => {
				history.replace(ROUTES.SETTINGS);
			}, 2000);
		} else {
			notifications.error({
				message: 'Error',
				description: response.error || 'error while updating the Channels',
			});
		}
		setSavingState(false);
	}, [selectedConfig, notifications, toggleSettingsTab, id]);

	const onSaveHandler = useCallback(
		(value: ChannelType) => {
			if (value === 'slack') {
				onSlackEditHandler();
			}
		},
		[onSlackEditHandler],
	);

	const onTestHandler = useCallback(() => {
		console.log('test');
	}, []);

	return (
		<>
			<FormAlertChannels
				{...{
					formInstance,
					onTypeChangeHandler,
					setSelectedConfig,
					type,
					onTestHandler,
					onSaveHandler,
					savingState,
					NotificationElement,
					title: 'Edit Notification Channels',
					initialValue,
					nameDisable: true,
				}}
			/>
		</>
	);
};

interface DispatchProps {
	toggleSettingsTab: (props: SettingTab) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	toggleSettingsTab: bindActionCreators(ToggleSettingsTab, dispatch),
});

interface EditAlertChannelsProps extends DispatchProps {
	initialValue: Store;
}

export default connect(null, mapDispatchToProps)(EditAlertChannels);
