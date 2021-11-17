import React, { useState } from "react";
import { servicesItem } from "store/actions";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Select } from "antd";
import styled from "styled-components";
const { Option } = Select;
import { cloneDeep } from "lodash-es";

const Container = styled.div`
  margin-top: 12px;
  display: flex;
  .info {
    display:flex;
    font-family: Roboto;
    margin-left: auto;
    margin-right: 12px;
    color: #4F4F4F;
    font-size: 14px;
    .anticon-info-circle {
      margin-top: 22px;
      margin-right: 18px;
    }
  }
`;

interface SelectServiceProps {
	services: servicesItem[];
	zoomToService: (arg0: string) => void;
	zoomToDefault: () => void;
}

const defaultOption = {
	serviceName: "Default"
};

const SelectService = (props: SelectServiceProps) => {
	const [selectedVal, setSelectedVal] = useState<string>(defaultOption.serviceName);
	const { zoomToService, zoomToDefault } = props;
	const services = cloneDeep(props.services);
	services.unshift(defaultOption)
	const handleSelect = (value: string) => {
		if(value === defaultOption.serviceName){
			zoomToDefault()
		} else {
			zoomToService(value);
		}
		setSelectedVal(value);
	};
	return (
		<Container>
			<Select
				style={{ width: 270, marginBottom: "56px" }}
				placeholder="Select a service"
				onChange={handleSelect}
				value={selectedVal}
			>
				{services.map(({ serviceName }) => (
					<Option key={serviceName} value={serviceName}>
						{serviceName}
					</Option>
				))}
			</Select>
      <div className='info'>
        <InfoCircleOutlined />
        <div>

        <div>-> Size of circles is proportial  to the number of requests served by each node </div>
          <div>-> Click on node name to reposition the node</div>
        </div>
      </div>
		</Container>
	);
};

export default SelectService;
