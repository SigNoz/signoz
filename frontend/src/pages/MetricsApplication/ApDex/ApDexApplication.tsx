import { useEffect, useState } from 'react';
import { Popover } from 'antd';
import { useAppParams } from 'lib/router/useAppParams';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import { useNotifications } from 'hooks/useNotifications';

import { Button, ButtonContainer } from '../styles';
import ApDexSettings from './ApDexSettings';
import { Settings } from '@signozhq/icons';

function ApDexApplication(): JSX.Element {
	const { servicename: encodedServiceName } = useAppParams<'servicename'>();
	const servicename = decodeURIComponent(encodedServiceName || '');

	const {
		data,
		isLoading,
		error,
		refetch: refetchGetApDexSetting,
	} = useGetApDexSettings(servicename);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const { notifications } = useNotifications();

	useEffect(() => {
		if (error) {
			notifications.error({
				message: error.getErrorCode(),
				description: error.getErrorMessage(),
			});
		}
	}, [error, notifications]);

	const handlePopOverClose = (): void => {
		setIsOpen(false);
	};

	const handleOpenChange = (newOpen: boolean): void => {
		setIsOpen(newOpen);
	};

	return (
		<Popover
			placement="bottomRight"
			destroyTooltipOnHide
			trigger={['click']}
			showArrow={false}
			open={isOpen}
			onOpenChange={handleOpenChange}
			overlayClassName="ap-dex-settings-popover"
			content={
				<ApDexSettings
					servicename={servicename}
					handlePopOverClose={handlePopOverClose}
					isLoading={isLoading}
					data={data}
					refetchGetApDexSetting={refetchGetApDexSetting}
				/>
			}
		>
			<div className="ap-dex-settings-popover-content">
				<Button size="middle">
					<ButtonContainer>
						<Settings size="md" /> Settings
					</ButtonContainer>
				</Button>
			</div>
		</Popover>
	);
}

export default ApDexApplication;
