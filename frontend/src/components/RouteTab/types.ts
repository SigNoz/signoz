import { TabsProps } from 'antd';
import { History } from 'history';

export interface RouteTabProps {
	routes: {
		name: React.ReactNode;
		route: string;
		Component: () => JSX.Element;
		key: string;
	}[];
	activeKey: TabsProps['activeKey'];
	onChangeHandler?: VoidFunction;
	history: History<unknown>;
}
