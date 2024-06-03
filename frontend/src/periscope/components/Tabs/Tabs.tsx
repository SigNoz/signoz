/* eslint-disable react/jsx-props-no-spreading */
import { Tabs as AntDTabs, TabsProps } from 'antd';
import React from 'react';

export interface TabProps {
	label: string | React.ReactElement;
	key: string;
	children: React.ReactElement;
}

export default function Tabs(props: TabsProps): React.ReactNode {
	return <AntDTabs {...props} />;
}
