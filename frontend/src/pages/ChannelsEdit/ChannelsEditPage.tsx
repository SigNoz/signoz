import { Spinner } from '@signozhq/ui/spinner';
import { toast } from '@signozhq/ui/sonner';
import { useGetNotificationChannel } from 'api/generated/services/channels';
import AlertBreadcrumb from 'components/AlertBreadcrumb';
import ROUTES from 'constants/routes';
import history from 'lib/history';
import ChannelForm from 'pages/AlertList/NotificationChannels/components/ChannelForm/ChannelForm';
import CopyButton from 'periscope/components/CopyButton/CopyButton';

import styles from './ChannelsEdit.module.scss';

interface ChannelsEditPageProps {
	channelId: string;
}

function ChannelsEditPage({ channelId }: ChannelsEditPageProps): JSX.Element {
	const { data, isLoading } = useGetNotificationChannel({ id: channelId });

	return (
		<>
			<AlertBreadcrumb
				items={[
					{ title: 'Channels', route: ROUTES.ALL_CHANNELS },
					{
						title: (
							<span className={styles.crumbName}>
								{isLoading ? (
									<Spinner
										size={14}
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
								)}
							</span>
						),
						isLast: true,
					},
				]}
			/>
			<div className={styles.content}>
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

export default ChannelsEditPage;
