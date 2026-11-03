import { Spinner } from '@signozhq/ui/spinner';
import { toast } from '@signozhq/ui/sonner';
import { useGetNotificationChannel } from 'api/generated/services/channels';
import BackHeader from 'components/BackHeader/BackHeader';
import ROUTES from 'constants/routes';
import { navigate } from 'lib/router/navigation';
import ChannelForm from 'pages/AlertList/NotificationChannels/components/ChannelForm/ChannelForm';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import styles from './ChannelsEdit.module.scss';

interface ChannelsEditPageProps {
	channelId: string;
}

function ChannelsEditPage({ channelId }: ChannelsEditPageProps): JSX.Element {
	const { data, isLoading } = useGetNotificationChannel({ id: channelId });

	return (
		<div className={styles.page}>
			<BackHeader
				backLabel="All channels"
				backRoute={ROUTES.ALL_CHANNELS}
				testId="channel-edit-header"
				title={
					isLoading ? (
						<Spinner
							size={16}
							aria-label="Loading channel"
							testId="channel-name-loading"
						/>
					) : (
						<>
							<span className="translate-safe">
								{data?.data?.displayName || 'Edit Channel'}
							</span>
							<CopyButton
								value={channelId}
								ariaLabel="Copy channel ID"
								testId="copy-channel-id"
								onCopy={(): void => {
									toast.success('Channel ID copied to clipboard');
								}}
							/>
						</>
					)
				}
			/>
			<ChannelForm
				channelId={channelId}
				onDone={(): void => {
					navigate(ROUTES.ALL_CHANNELS, { replace: true });
				}}
			/>
		</div>
	);
}

export default ChannelsEditPage;
