import { DrawerProps } from 'antd';
import { HostData } from 'api/infraMonitoring/getHostLists';

export type HostDetailProps = {
	host: HostData | null;
	isModalTimeSelection: boolean;
} & Pick<DrawerProps, 'onClose'>;
