import './styles.scss';

import { Button, Card, Col, Divider, Row, Switch, Typography } from 'antd';
import MultiSelect, {
	MultiSelectOption,
	MultiSelectSection,
} from 'components/MultiSelect';
import { useState } from 'react';

const { Title, Text, Paragraph } = Typography;

// Sample data for the component
const sampleOptions: MultiSelectOption[] = [
	{ label: 'abc', value: 'abc' },
	{ label: 'acbewc', value: 'acbewc' },
	{ label: 'custom-value', value: 'custom-value' },
	{ label: 'option1', value: 'option1' },
	{ label: 'option2', value: 'option2' },
	{ label: 'another-option', value: 'another-option' },
	{ label: 'test-option', value: 'test-option' },
	{ label: 'disabled-option', value: 'disabled-option', disabled: true },
];

// Sample related values for the "Related Values" section
const relatedValues: MultiSelectOption[] = [
	{ label: 'gke-mgmt-pl-generator-e2st4-sp-f1c1bde8-skbl', value: 'gke-1' },
	{ label: 'gke-mgmt-pl-generator-e2st4-sp-f1c1bde8-skb2', value: 'gke-2' },
	{ label: 'gke-mgmt-pl-generator-e2st4-sp-f1c1bde8-skb3', value: 'gke-3' },
];

// Sample all values for the "All Values" section
const allValues: MultiSelectOption[] = Array.from({ length: 20 }, (_, i) => ({
	label: `gke-mgmt-pl-generator-e2st4-sp-f1c1bde8-7a7w-${i + 1}`,
	value: `all-${i + 1}`,
}));

// Creating sections
const sections: MultiSelectSection[] = [
	{
		title: 'Related Values',
		options: relatedValues,
	},
	{
		title: 'ALL Values',
		options: allValues,
	},
];

function DynamicVariableTestPage(): JSX.Element {
	const [selectedValues, setSelectedValues] = useState<string[]>([
		'abc',
		'acbewc',
	]);
	const [loadingDemo, setLoadingDemo] = useState<boolean>(false);
	const [allowCustom, setAllowCustom] = useState<boolean>(true);
	const [showError, setShowError] = useState<boolean>(false);
	const [disabled, setDisabled] = useState<boolean>(false);

	const handleChange = (values: string[]): void => {
		setSelectedValues(values);
	};

	const toggleLoading = (): void => {
		setLoadingDemo((prev) => !prev);
	};

	return (
		<div className="dynamic-variable-page">
			<Card>
				<Title level={3}>Dynamic Variable MultiSelect</Title>
				<Paragraph>
					This page demonstrates the MultiSelect component with various features. The
					component is now fully reusable and production-ready with support for
					dynamic data from APIs, proper error states, accessibility, and UI
					improvements.
				</Paragraph>

				<Divider />

				<Row gutter={[16, 16]}>
					<Col xs={24} md={12}>
						<Title level={5}>Basic MultiSelect</Title>
						<Text>This example shows the basic usage with pre-selected values.</Text>
						<div className="multiselect-demo-container">
							<MultiSelect
								options={sampleOptions}
								value={selectedValues}
								onChange={handleChange}
								placeholder="Search or add values..."
								label="Select options"
							/>
						</div>
						<div className="selected-values-display">
							<Title level={5}>Selected Values:</Title>
							<pre>{JSON.stringify(selectedValues, null, 2)}</pre>
						</div>
					</Col>

					<Col xs={24} md={12}>
						<Title level={5}>With Sections & All Values</Title>
						<Text>This example shows the component with additional sections.</Text>
						<div className="multiselect-demo-container">
							<MultiSelect
								options={sampleOptions}
								value={selectedValues}
								onChange={handleChange}
								placeholder="Search or add values..."
								additionalSections={sections}
								sectionMaxHeight={120}
							/>
						</div>
					</Col>
				</Row>

				<Divider />

				<Row gutter={[16, 16]}>
					<Col xs={24} md={12}>
						<Title level={5}>Loading State</Title>
						<Text>This example demonstrates the loading state.</Text>
						<div className="multiselect-demo-container">
							<MultiSelect
								options={sampleOptions}
								value={[]}
								onChange={(): void => {}}
								loading={loadingDemo}
								placeholder="This shows loading state..."
							/>
							<Button onClick={toggleLoading} style={{ marginTop: 16 }}>
								{loadingDemo ? 'Stop Loading' : 'Simulate Loading'}
							</Button>
						</div>
					</Col>

					<Col xs={24} md={12}>
						<Title level={5}>Custom Values Configuration</Title>
						<Text>Toggle to enable/disable custom values.</Text>
						<div className="multiselect-demo-container">
							<MultiSelect
								options={sampleOptions}
								value={[]}
								onChange={(): void => {}}
								allowCustomValues={allowCustom}
								placeholder={
									allowCustom ? 'Custom values allowed...' : 'Only predefined values...'
								}
							/>
							<div style={{ marginTop: 16 }}>
								<Switch
									checked={allowCustom}
									onChange={setAllowCustom}
									checkedChildren="Custom values on"
									unCheckedChildren="Custom values off"
								/>
							</div>
						</div>
					</Col>
				</Row>

				<Divider />

				<Row gutter={[16, 16]}>
					<Col xs={24} md={12}>
						<Title level={5}>Error State</Title>
						<Text>This example shows the component with an error.</Text>
						<div className="multiselect-demo-container">
							<MultiSelect
								options={sampleOptions}
								value={[]}
								onChange={(): void => {}}
								placeholder="Select some options..."
								error={showError ? 'Please select at least one option' : undefined}
							/>
							<Button
								onClick={(): void => setShowError(!showError)}
								style={{ marginTop: 16 }}
								type={showError ? 'primary' : 'default'}
							>
								{showError ? 'Hide Error' : 'Show Error'}
							</Button>
						</div>
					</Col>

					<Col xs={24} md={12}>
						<Title level={5}>Disabled State</Title>
						<Text>This example shows the disabled state of the component.</Text>
						<div className="multiselect-demo-container">
							<MultiSelect
								options={sampleOptions}
								value={['abc', 'option1']}
								onChange={(): void => {}}
								placeholder="This component is disabled..."
								disabled={disabled}
							/>
							<div style={{ marginTop: 16 }}>
								<Switch
									checked={disabled}
									onChange={setDisabled}
									checkedChildren="Disabled"
									unCheckedChildren="Enabled"
								/>
							</div>
						</div>
					</Col>
				</Row>
			</Card>
		</div>
	);
}

export default DynamicVariableTestPage;
