/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { Tabs as AntDTabs, TabsProps } from 'antd';

export interface TabProps {
	label: string | React.ReactElement;
	key: string;
	children: React.ReactElement;
}

export default function Tabs(props: TabsProps): React.ReactNode {
	return <AntDTabs {...props} />;
}
