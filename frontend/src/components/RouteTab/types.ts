import { History } from 'history';
import { ReactNode } from 'react';

export type TabRoutes = {
	name: React.ReactNode;
	route: string;
	Component: () => JSX.Element;
	key: string;
};

export interface RouteTabProps {
	routes: TabRoutes[];
	activeKey: string | undefined;
	defaultActiveKey?: string;
	onChangeHandler?: (key: string) => void;
	history: History<unknown>;
	showRightSection?: boolean;
	tabBarExtraContent?: ReactNode;
	hideTabBar?: boolean;
}
