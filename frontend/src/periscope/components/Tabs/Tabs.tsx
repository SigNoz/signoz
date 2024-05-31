import { Tabs as AntDTabs, TabsProps } from 'antd';

export interface TabProps {
	label: string | React.ReactElement;
	key: string;
	children: React.ReactElement;
}

export default function Tabs(props: TabsProps) {
	return <AntDTabs {...props} />;
}
