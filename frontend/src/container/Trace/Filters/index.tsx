import React, { useState } from 'react';

import { Collapse, Slider, Typography, Checkbox, Space } from 'antd';
const { Panel } = Collapse;
import { DurationContainer, InputComponent } from './styles';
import PanelOptions from './Panel';

const Filters = (): JSX.Element => {
	function callback(key: string | string[]) {
		if (key) {
			// fetch the filters and updated the redux selectedFilters
			console.log(key);
		} else {
			console.log('clossed');
		}
	}

	return (
		<Collapse
			destroyInactivePanel
			expandIconPosition="right"
			accordion
			onChange={callback}
		>
			<Panel header="Duration" showArrow key="duration">
				<DurationContainer>
					<Typography>Min</Typography>
					<InputComponent />

					<Typography>Min</Typography>
					<InputComponent />
				</DurationContainer>
				<Slider range defaultValue={[0, 100]} />
			</Panel>

			<Panel header="Status" key="status">
				<Space direction="vertical" align="center">
					<Checkbox>asd</Checkbox>
					<Checkbox>asd</Checkbox>
				</Space>
			</Panel>

			<Panel header="Service" key="service">
				<Space direction="vertical" align="center"></Space>
			</Panel>

			<Panel header="HTTP CODE" key="http_code">
				<Space direction="vertical" align="center">
					<PanelOptions text="asd" />
					<PanelOptions text="asd" />
					<PanelOptions text="asd" />
				</Space>
			</Panel>
		</Collapse>
	);
};

export default Filters;
