import { matchPath, useLocation } from 'react-router-dom';
import { useGetNotificationChannel } from 'api/generated/services/channels';
import AlertBreadcrumb from 'components/AlertBreadcrumb';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import ChannelForm from 'pages/AlertList/NotificationChannels/components/ChannelForm/ChannelForm';

import './ChannelsEdit.styles.scss';

function ChannelsEdit(): JSX.Element {
	const { pathname } = useLocation();
	const channelId = matchPath<{ channelId: string }>(pathname, {
		path: ROUTES.CHANNELS_EDIT,
	})?.params?.channelId;

	// The form runs the same query, so this resolves from the cache rather than
	// fetching the channel twice.
	const { data } = useGetNotificationChannel(
		{ id: channelId ?? '' },
		{ query: { enabled: !!channelId } },
	);

	return (
		<>
			<AlertBreadcrumb
				items={[
					{ title: 'All Channels', route: ROUTES.ALL_CHANNELS },
					{ title: data?.data?.displayName || 'Edit Channel', isLast: true },
				]}
			/>
			<div className="edit-alert-channels-container">
				<ChannelForm
					channelId={channelId}
					onDone={(): void => {
						history.replace(ROUTES.ALL_CHANNELS);
					}}
				/>
			</div>
		</>
	);
}

export default ChannelsEdit;
