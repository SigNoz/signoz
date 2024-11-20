import { TabsProps } from 'antd';
import { History } from 'history';

export type TabRoutes = {
	name: React.ReactNode;
	route: string;
	Component: () => JSX.Element;
	key: string;
};

export interface RouteTabProps {
	routes: TabRoutes[];
	activeKey: TabsProps['activeKey'];
	onChangeHandler?: (key: string) => void;
	history: History<unknown>;
}
