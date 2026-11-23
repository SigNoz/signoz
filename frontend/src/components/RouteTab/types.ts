import type { ComponentType } from 'react';
import type { TabsProps } from 'antd';

export type TabRoutes = {
	name: React.ReactNode;
	route: string;
	Component: ComponentType;
	key: string;
};

export interface RouteTabProps {
	routes: TabRoutes[];
	activeKey: TabsProps['activeKey'];
	onChangeHandler?: (key: string) => void;
	showRightSection: boolean;
}
