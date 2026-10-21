import { useLocation } from 'react-router-dom';
import { Skeleton } from 'antd';
import BackHeader from 'components/BackHeader/BackHeader';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import { withAuthZPage } from 'lib/authz/components/withAuthZ/withAuthZPage';
import { NotificationChannelCreatePermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import { ChannelKind } from 'container/CreateAlertChannels/types';
import ChannelForm from 'pages/AlertList/NotificationChannels/components/ChannelForm/ChannelForm';
import { KIND_KEY } from 'pages/AlertList/NotificationChannels/constants';

import styles from './styles.module.scss';

function ChannelsNew(): JSX.Element {
	const requested = new URLSearchParams(useLocation().search).get('kind');
	// an unknown kind in the URL falls back to the form's own default
	const initialKind = (Object.values(ChannelKind) as string[]).includes(
		requested ?? '',
	)
		? (requested as ChannelKind)
		: undefined;

	// Leaving goes back to the list the way it was left: filtered by the kind
	// that opened this form.
	const listRoute = initialKind
		? `${ROUTES.ALL_CHANNELS}&${KIND_KEY}=${initialKind}`
		: ROUTES.ALL_CHANNELS;

	return (
		<div className={styles.page}>
			<BackHeader
				backLabel="All channels"
				backRoute={listRoute}
				title="New channel"
				testId="channel-new-header"
			/>
			<ChannelForm
				initialKind={initialKind}
				onDone={(): void => {
					history.replace(listRoute);
				}}
			/>
		</div>
	);
}

export default withAuthZPage(ChannelsNew, {
	checks: [NotificationChannelCreatePermission],
	fallbackOnLoading: (
		<div className={styles.loading}>
			<Skeleton active paragraph={{ rows: 8 }} />
		</div>
	),
});
