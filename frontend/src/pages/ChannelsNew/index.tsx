import AlertBreadcrumb from 'components/AlertBreadcrumb';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { withAuthZPage } from 'lib/authz/components/withAuthZ/withAuthZPage';
import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import ChannelForm from 'pages/AlertList/NotificationChannels/components/ChannelForm/ChannelForm';

import styles from './styles.module.scss';

function ChannelsNew(): JSX.Element {
	return (
		<>
			<AlertBreadcrumb
				items={[
					{ title: 'All Channels', route: ROUTES.ALL_CHANNELS },
					{ title: 'New Channel', isLast: true },
				]}
			/>
			<div className={styles.content}>
				<ChannelForm
					onDone={(): void => {
						history.replace(ROUTES.ALL_CHANNELS);
					}}
				/>
			</div>
		</>
	);
}

export default withAuthZPage(ChannelsNew, {
	checks: [NotificationChannelCreatePermission],
});
