import React, { useState } from "react";
import { servicesItem } from "Src/store/actions";
import { Select } from "antd";
const { Option } = Select;

interface SelectServiceProps {
	services: servicesItem[];
	zoomToService: (arg0: string) => void;
}

const SelectService = (props: SelectServiceProps) => {
	const [selectedVal, setSelectedVal] = useState<string>();
	const { services, zoomToService } = props;
	const handleSelect = (value: string) => {
		setSelectedVal(value);
		zoomToService(value);
	};
	return (
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
	);
};

export default SelectService;
