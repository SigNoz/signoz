import { TabsProps } from 'antd';
// import type { NavigateFunction } from 'react-router-dom-v5-compat';

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
	// safeNavigate: NavigateFunction;
}
