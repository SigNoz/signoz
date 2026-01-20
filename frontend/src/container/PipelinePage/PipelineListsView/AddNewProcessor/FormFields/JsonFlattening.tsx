import './JsonFlattening.styles.scss';

import { InfoCircleOutlined } from '@ant-design/icons';
import { Form, Input, Space, Switch, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { ProcessorData } from 'types/api/pipeline/def';

import { PREDEFINED_MAPPING } from '../config';
import KeyValueList from './KeyValueList';

interface JsonFlatteningProps {
	selectedProcessorData?: ProcessorData;
	isAdd: boolean;
}

function JsonFlattening({
	selectedProcessorData,
	isAdd,
}: JsonFlatteningProps): JSX.Element | null {
	const form = Form.useFormInstance();
	const mappingValue = selectedProcessorData?.mapping || {};
	const enableFlattening = Form.useWatch('enable_flattening', form);
	const enablePaths = Form.useWatch('enable_paths', form);

	const [enableMapping, setEnableMapping] = useState(
		!!mappingValue && Object.keys(mappingValue).length > 0,
	);

	const selectedMapping = selectedProcessorData?.mapping;
	useEffect(() => {
		if (!enableMapping) {
			form.setFieldsValue({ mapping: undefined });
		} else if (form.getFieldValue('mapping') === undefined) {
			form.setFieldsValue({
				mapping: selectedMapping || PREDEFINED_MAPPING,
			});
		}
	}, [enableMapping, form, selectedMapping]);

	const handleEnableMappingChange = (checked: boolean): void => {
		setEnableMapping(checked);
	};

	const handleEnablePathsChange = (checked: boolean): void => {
		form.setFieldValue('enable_paths', checked);
	};

	if (!enableFlattening) {
		return null;
	}

	return (
		<div className="json-flattening-form">
			<Form.Item
				className="json-flattening-form__item"
				name="enable_paths"
				valuePropName="checked"
				initialValue={isAdd ? true : selectedProcessorData?.enable_paths}
			>
				<Space>
					<Switch
						size="small"
						checked={enablePaths}
						onChange={handleEnablePathsChange}
					/>
					Enable Paths
				</Space>
			</Form.Item>

			{enablePaths && (
				<Form.Item
					name="path_prefix"
					label="Path Prefix"
					initialValue={selectedProcessorData?.path_prefix}
				>
					<Input placeholder="Path Prefix" />
				</Form.Item>
			)}

			<Form.Item className="json-flattening-form__item">
				<Space>
					<Switch
						size="small"
						checked={enableMapping}
						onChange={handleEnableMappingChange}
					/>
					Enable Mapping
					<Tooltip title="The order of filled keys will determine the priority of keys i.e. earlier keys have higher precedence">
						<InfoCircleOutlined />
					</Tooltip>
				</Space>
			</Form.Item>

			{enableMapping && (
				<Form.Item
					name="mapping"
					initialValue={selectedProcessorData?.mapping || PREDEFINED_MAPPING}
				>
					<KeyValueList />
				</Form.Item>
			)}
		</div>
	);
}

JsonFlattening.defaultProps = {
	selectedProcessorData: undefined,
};

export default JsonFlattening;
