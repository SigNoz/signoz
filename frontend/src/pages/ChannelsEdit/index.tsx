import { Skeleton } from 'antd';
import ROUTES from 'constants/routes';
import { useAppLocation } from 'lib/router/useAppLocation';
import { matchRoute } from 'lib/router/matchRoute';
import { Redirect } from 'lib/router/Redirect';
import { withAuthZPage } from 'lib/authz/components/withAuthZ/withAuthZPage';
import {
	buildNotificationChannelReadPermission,
	buildNotificationChannelUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';

import ChannelsEditPage from './ChannelsEditPage';
import styles from './ChannelsEdit.module.scss';

function ChannelsEdit(): JSX.Element {
	const { pathname } = useAppLocation();
	const channelId = matchRoute<'channelId'>(pathname, ROUTES.CHANNELS_EDIT)
		?.params?.channelId;

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
	fallbackOnLoading: (
		<div className={styles.loading}>
			<Skeleton active paragraph={{ rows: 8 }} />
		</div>
	),
});
