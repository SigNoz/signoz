/* eslint-disable */
//@ts-nocheck

import { InfoCircleOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import { cloneDeep } from 'lodash-es';
import React, { useState } from 'react';
import { ServicesItem } from 'store/actions';
import styled from 'styled-components';

const { Option } = Select;

const Container = styled.div`
	margin-top: 12px;
	display: flex;
	.info {
		display: flex;
		font-family: Roboto;
		margin-left: auto;
		margin-right: 12px;
		color: #4f4f4f;
		font-size: 14px;
		.anticon-info-circle {
			margin-top: 22px;
			margin-right: 18px;
		}
	}
`;

interface SelectServiceProps {
	services: ServicesItem[];
	zoomToService: (arg0: string) => void;
	zoomToDefault: () => void;
}

const defaultOption = {
	serviceName: 'Default',
};

function SelectService(props: SelectServiceProps): JSX.Element {
	const [selectedVal, setSelectedVal] = useState<string>(
		defaultOption.serviceName,
	);
	const { zoomToService, zoomToDefault, services } = props;
	const service = cloneDeep(services);
	service.unshift(defaultOption);

	const handleSelect = (value: string): void => {
		if (value === defaultOption.serviceName) {
			zoomToDefault();
		} else {
			zoomToService(value);
		}
		setSelectedVal(value);
	};
	return (
		<Container>
			<Select
				style={{ width: 270, marginBottom: '56px' }}
				placeholder="Select a service"
				onChange={handleSelect}
				value={selectedVal}
			>
				{service.map(({ serviceName }) => (
					<Option key={serviceName} value={serviceName}>
						{serviceName}
					</Option>
				))}
			</Select>
			<div className="info">
				<InfoCircleOutlined />
				<div>
					<div>
						&gt; Size of circles is proportial to the number of requests served by
						each node
					</div>
					<div>&gt; Click on node name to reposition the node</div>
				</div>
			</div>
		</Container>
	);
}

export default SelectService;
