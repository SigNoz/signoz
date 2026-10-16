import { matchPath, Redirect, useLocation } from 'react-router-dom';
import { Skeleton } from 'antd';
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

const channelIdFromRoute = (router: {
	matchPath: <P extends Record<string, string>>(p: string) => P | null;
}): string =>
	router.matchPath<{ channelId: string }>(ROUTES.CHANNELS_EDIT)?.channelId ?? '';

export default withAuthZPage(ChannelsEdit, {
	// `read` alone opens the screen; `update` only decides whether it can be
	// saved, so it is warmed here and enforced on the save button.
	checks: (_props, router) => [
		buildNotificationChannelReadPermission(channelIdFromRoute(router)),
	],
	preloadChecks: (_props, router) => [
		buildNotificationChannelUpdatePermission(channelIdFromRoute(router)),
	],
	fallbackOnLoading: <Skeleton active paragraph={{ rows: 8 }} />,
});
