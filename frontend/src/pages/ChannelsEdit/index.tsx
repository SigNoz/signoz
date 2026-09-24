import { matchPath, Redirect, useLocation } from 'react-router-dom';
import ROUTES from 'constants/routes';
import { withAuthZPage } from 'lib/authz/components/withAuthZ/withAuthZPage';
import {
	buildNotificationChannelReadPermission,
	buildNotificationChannelUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';

import ChannelsEditPage from './ChannelsEditPage';

function ChannelsEdit(): JSX.Element {
	const { pathname } = useLocation();
	const channelId = matchPath<{ channelId: string }>(pathname, {
		path: ROUTES.CHANNELS_EDIT,
	})?.params?.channelId;

	if (!channelId) {
		return <Redirect to={ROUTES.ALL_CHANNELS} />;
	}

	return <ChannelsEditPage channelId={channelId} />;
}

// Editing needs `read` as well as `update`, per the authz guide.
export default withAuthZPage(ChannelsEdit, {
	checks: (_props, router) => {
		const channelId =
			router.matchPath<{ channelId: string }>(ROUTES.CHANNELS_EDIT)?.channelId ??
			'';
		return [
			buildNotificationChannelReadPermission(channelId),
			buildNotificationChannelUpdatePermission(channelId),
		];
	},
});
