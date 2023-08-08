import { SettingOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import { useGetApDexSettings } from 'hooks/apDex/useGetApDexSettings';
import useErrorNotification from 'hooks/useErrorNotification';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '../styles';
import ApDexSettings from './ApDexSettings';

function ApDexApplication(): JSX.Element {
	const { servicename } = useParams<{ servicename: string }>();
	const { data, isLoading, error, refetch } = useGetApDexSettings(servicename);
	const [isOpen, setIsOpen] = useState<boolean>(false);
	useErrorNotification(error);

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
			content={
				<ApDexSettings
					servicename={servicename}
					handlePopOverClose={handlePopOverClose}
					isLoading={isLoading}
					data={data}
					refetch={refetch}
				/>
			}
		>
			<Button size="middle" icon={<SettingOutlined />}>
				Settings
			</Button>
		</Popover>
	);
}

export default ApDexApplication;
