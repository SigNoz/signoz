import { DrawerProps } from 'antd';
import { HostData } from 'api/infraMonitoring/getHostLists';

export type HostDetailProps = {
	host: HostData | null;
} & Pick<DrawerProps, 'onClose'>;
