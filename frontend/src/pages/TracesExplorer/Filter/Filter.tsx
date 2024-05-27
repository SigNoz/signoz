import './Filter.styles.scss';

import { ArrowLeftOutlined, FilterOutlined } from '@ant-design/icons';
import { Button, Flex, Typography } from 'antd';
import { AllTraceFilterEnum } from 'container/Trace/Filters';
import { Dispatch, SetStateAction } from 'react';

import { Section } from './Section';

interface FilterProps {
	setOpen: Dispatch<SetStateAction<boolean>>;
}

export function Filter(props: FilterProps): JSX.Element {
	const { setOpen } = props;
	return (
		<>
			<Flex justify="space-between" align="center" className="filter-header">
				<div className="filter-title">
					<FilterOutlined />
					<Typography.Text>Filters</Typography.Text>
				</div>
				<Button onClick={(): void => setOpen(false)} className="arrow-icon">
					<ArrowLeftOutlined />
				</Button>
			</Flex>
			<>
				{AllTraceFilterEnum.map((panelName) => (
					<Section key={panelName} panelName={panelName} />
				))}
			</>
		</>
	);
}
