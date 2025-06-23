import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Input, Space, Switch, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { ProcessorData } from 'types/api/pipeline/def';

import KeyValueList, { PREDEFINED_MAPPING } from './KeyValueList';

interface JsonFlatteningProps {
	selectedProcessorData?: ProcessorData;
}

function JsonFlattening({
	selectedProcessorData,
}: JsonFlatteningProps): JSX.Element {
	const form = Form.useFormInstance();
	const mappingValue = selectedProcessorData?.mapping || {};
	const enableFlattening = Form.useWatch('enable_flattening', form);

	const [enableMapping, setEnableMapping] = useState(
		!!mappingValue && Object.keys(mappingValue).length > 0,
	);

	useEffect(() => {
		if (!enableMapping) {
			form.setFieldsValue({ mapping: undefined });
		} else if (form.getFieldValue('mapping') === undefined) {
			form.setFieldsValue({
				mapping: selectedProcessorData?.mapping || PREDEFINED_MAPPING,
			});
		}
	}, [enableMapping, form, selectedProcessorData?.mapping]);

	const handleEnableMappingChange = (checked: boolean): void => {
		setEnableMapping(checked);
	};

	return (
		<>
			<Form.Item
				name="enable_flattening"
				valuePropName="checked"
				initialValue={selectedProcessorData?.enable_flattening}
			>
				<Switch size="small" />
			</Form.Item>

			{enableFlattening && (
				<>
					<Form.Item
						name="enable_paths"
						label="Enable Paths"
						valuePropName="checked"
						initialValue={selectedProcessorData?.enable_paths}
					>
						<Switch size="small" />
					</Form.Item>

					<Form.Item
						name="path_prefix"
						label="Path Prefix"
						initialValue={selectedProcessorData?.path_prefix}
					>
						<Input placeholder="Path Prefix" />
					</Form.Item>

					<Form.Item
						label={
							<Space>
								Enable Mapping
								<Tooltip title="The order of filled keys will determine the priority of keys i.e. earlier keys have higher precedence">
									<InfoCircleOutlined />
								</Tooltip>
							</Space>
						}
					>
						<Switch
							size="small"
							checked={enableMapping}
							onChange={handleEnableMappingChange}
						/>
					</Form.Item>

					{enableMapping && (
						<Form.Item
							name="mapping"
							label="Mapping"
							initialValue={selectedProcessorData?.mapping || PREDEFINED_MAPPING}
						>
							<KeyValueList />
						</Form.Item>
					)}
				</>
			)}
		</>
	);
}

JsonFlattening.defaultProps = {
	selectedProcessorData: undefined,
};

export default JsonFlattening;
