/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable sonarjs/no-duplicate-string */
import './styles.scss';

import {
	Card,
	Col,
	Divider,
	Input,
	Row,
	Space,
	Switch,
	Tabs,
	Tooltip,
	Typography,
} from 'antd';
import {
	CustomMultiSelect,
	CustomSelect,
	OptionData,
} from 'components/NewSelect';
import { useEffect, useState } from 'react';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

// Generate a large set of sample data for better scrolling examples
const generateSampleData = (): { basicData: any; largeData: any } => {
	// Create basic sample data
	const basicData = {
		relatedValues: {
			label: 'Related Values',
			options: [
				{ label: 'abc', value: 'abc' },
				{ label: 'acbewc', value: 'acbewc' },
			],
		},
		allValues: [
			{
				label: 'All Values Group 1',
				options: [
					{
						label: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-skbl',
						value: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-skbl',
					},
					{
						label: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-skbl-2',
						value: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-skbl-2',
					},
				],
			},
			{
				label: 'All Values Group 2',
				options: [
					{
						label: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-7n7w',
						value: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-7n7w',
					},
					{
						label: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-7n7w-2',
						value: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-7n7w-2',
					},
					{
						label: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-7n7w-3',
						value: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-7n7w-3',
					},
				],
			},
		],
		options: [
			{ label: 'abc', value: 'abc' },
			{ label: 'acbewc', value: 'acbewc' },
			{
				label: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-skbl',
				value: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-skbl',
			},
			{
				label: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-7n7w',
				value: 'gke-mgmt-pl-generator-e2st4-sp-41c1bdc8-7n7w',
			},
		],
	};

	// Create large dataset for good scrolling examples
	const largeData = {
		relatedValues: {
			label: 'Related Values',
			options: Array(10)
				.fill(0)
				.map((_, i) => ({
					label: `related-value-${i + 1}`,
					value: `related-value-${i + 1}`,
				})),
		},
		allValues: [
			{
				label: 'Kubernetes Pods',
				options: Array(5)
					.fill(0)
					.map((_, i) => ({
						label: `pod-${i + 1}-kubernetes-cluster-production`,
						value: `pod-${i + 1}-kubernetes-cluster-production`,
					})),
			},
			{
				label: 'AWS EC2 Instances',
				options: Array(10)
					.fill(0)
					.map((_, i) => ({
						label: `i-${Math.random()
							.toString(36)
							.substring(2, 10)}.ec2.compute-1.amazonaws.com`,
						value: `aws-ec2-${i + 1}`,
					})),
			},
			{
				label: 'Google Cloud VMs',
				options: Array(10)
					.fill(0)
					.map((_, i) => ({
						label: `gke-mgmt-pl-generator-e2st4-sp-${Math.random()
							.toString(36)
							.substring(2, 10)}`,
						value: `gcp-vm-${i + 1}`,
					})),
			},
		],
		options: Array(30)
			.fill(0)
			.map((_, i) => ({
				label: `option-${i + 1}-${Math.random().toString(36).substring(2, 10)}`,
				value: `option-${i + 1}`,
			})),
	};

	return { basicData, largeData };
};

const newFormatOptions: OptionData[] = [
	{
		label: 'Related Values',
		options: [
			{ label: 'Jack', value: 'Jack' },
			{ label: 'Lucy', value: 'Lucy' },
			{ label: 'Chloe', value: 'Chloe' },
			{ label: 'Lucas', value: 'Lucas' },
			{ value: '1', label: 'Jacky' },
			{ value: '2', label: 'Lucial' },
			{ value: '3', label: 'Tom' },
		],
	},
	{
		label: 'All Values',
		options: [
			{ label: 'Chloe', value: 'Chloe' },
			{ label: 'Lucas', value: 'Lucas' },
		],
	},
	{ value: '1', label: 'Jacky' },
	{ value: '2', label: 'Lucial' },
	{ value: '3', label: 'Tom' },
	{ label: 'Chloe', value: 'Chloe' },
	{ label: 'Lucas', value: 'Lucas' },
];

function NewSelectDemo(): JSX.Element {
	// State management for demo
	const [singleSelectValue, setSingleSelectValue] = useState<string>();
	const [multiSelectValue, setMultiSelectValue] = useState<string[]>([]);
	const [searchText, setSearchText] = useState('');
	const [loading, setLoading] = useState(false);
	const [showError, setShowError] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>('');
	const [noData, setNoData] = useState(false);
	const [sampleData, setSampleData] = useState<any>(null);

	// Initialize sample data
	useEffect(() => {
		setSampleData(generateSampleData());
	}, []);

	if (!sampleData) {
		return <div>Loading...</div>;
	}

	const { basicData, largeData } = sampleData;

	// Filter options based on search text
	const getFilteredOptions = (options: any[]): any[] =>
		options.filter((option) =>
			option.label.toLowerCase().includes(searchText.toLowerCase()),
		);

	// Handle search with simulated loading
	const handleSearch = (text: string): void => {
		setSearchText(text);
		setLoading(true);

		// Simulate API delay
		setTimeout(() => {
			setLoading(false);
		}, 500);
	};

	// Toggle error state for demo
	const toggleError = (): void => {
		setShowError(!showError);
		if (!showError) {
			setErrorMessage('Unable to fetch data. Please try again.');
		} else {
			setErrorMessage('');
		}
	};

	// Toggle loading state for demo
	const toggleLoading = (): void => {
		setLoading(!loading);
	};

	// Toggle no data state for demo
	const toggleNoData = (): void => {
		setNoData(!noData);
	};

	// Get options based on current demo state
	const getOptions = (baseOptions: any[]): any[] => {
		if (noData) return [];
		return getFilteredOptions(baseOptions);
	};

	return (
		<div className="new-select-demo-container">
			<Title level={2}>Custom Select Components</Title>
			<Paragraph>
				These components extend Ant Design&apos;s Select with support for multiple
				sections, scrollable areas, automatic tokenization, search highlighting, and
				enhanced keyboard navigation. They also include proper accessibility
				attributes and state handling.
			</Paragraph>

			<Card title="Demo Controls" className="demo-control-card">
				<Space>
					<Space>
						<Text>Show Loading:</Text>
						<Switch checked={loading} onChange={toggleLoading} />
					</Space>
					<Space>
						<Text>Show Error:</Text>
						<Switch checked={showError} onChange={toggleError} />
					</Space>
					<Space>
						<Text>Show No Data:</Text>
						<Switch checked={noData} onChange={toggleNoData} />
					</Space>
					{showError && (
						<Space>
							<Text>Error Message:</Text>
							<Input
								value={errorMessage}
								onChange={(e): void => setErrorMessage(e.target.value)}
								placeholder="Custom error message"
								style={{ width: 300 }}
							/>
						</Space>
					)}
				</Space>
			</Card>

			<Tabs defaultActiveKey="single" className="demo-tabs">
				<TabPane tab="Single Select" key="single">
					<Row gutter={[24, 24]}>
						<Col span={12}>
							<Card title="Basic Features" className="demo-card">
								<Space direction="vertical" style={{ width: '100%' }}>
									<Title level={5}>Standard Usage</Title>
									<Paragraph>
										Basic single select with search and custom dropdown rendering.
									</Paragraph>
									<CustomSelect
										placeholder="Search..."
										value={singleSelectValue}
										onChange={(value): void => {
											console.log('Basic Usage', value);
											setSingleSelectValue(value as string);
										}}
										options={getOptions(basicData.options)}
										onSearch={handleSearch}
										loading={loading}
										errorMessage={showError ? errorMessage : undefined}
									/>

									<Divider />

									<Title level={5}>With Section Headers</Title>
									<Paragraph>
										Demonstrates grouping options under section headers.
									</Paragraph>
									<CustomSelect
										placeholder="Search with sections..."
										value={singleSelectValue}
										onChange={(value): void => {
											console.log('With Sections', value);
											setSingleSelectValue(value as string);
										}}
										options={newFormatOptions}
										onSearch={handleSearch}
										loading={loading}
										errorMessage={showError ? errorMessage : undefined}
									/>

									<Divider />

									<Title level={5}>Section Header with Large Dataset</Title>
									<Paragraph>
										Demonstrates grouping options under section headers with large
										dataset.
									</Paragraph>
									<CustomSelect
										placeholder="Search in large dataset..."
										value={singleSelectValue}
										onChange={(value): void => {
											console.log('Custom Style', value);
											setSingleSelectValue(value as string);
										}}
										options={[...getOptions(basicData.options), ...largeData.allValues]}
										onSearch={handleSearch}
										loading={loading}
										errorMessage={showError ? errorMessage : undefined}
										className="custom-styled-select"
										popupClassName="custom-styled-dropdown"
									/>
								</Space>
							</Card>
						</Col>

						<Col span={12}>
							<Card title="Advanced Features" className="demo-card">
								<Space direction="vertical" style={{ width: '100%' }}>
									<Title level={5}>Large Dataset with Scrolling</Title>
									<Paragraph>
										This example shows how the component handles large datasets with
										smooth scrolling. Use keyboard navigation (arrow keys, Tab) to see
										auto-scrolling to active options.
									</Paragraph>
									<CustomSelect
										placeholder="Search in large dataset..."
										value={singleSelectValue}
										onChange={(value): void => {
											console.log('Large Dataset', value);
											setSingleSelectValue(value as string);
										}}
										options={getOptions(largeData.options)}
										onSearch={handleSearch}
										loading={loading}
										errorMessage={showError ? errorMessage : undefined}
									/>

									<Divider />

									<Title level={5}>Custom Value Support</Title>
									<Paragraph>
										Type something that doesn&apos;t match any option and press Enter to
										add a custom value. Custom values are highlighted with a badge.
									</Paragraph>
									<CustomSelect
										placeholder="Type a custom value..."
										value={singleSelectValue}
										onChange={(value): void => {
											console.log('Custom Value', value);
											setSingleSelectValue(value as string);
										}}
										options={getOptions(basicData.options)}
										onSearch={handleSearch}
										loading={loading}
										errorMessage={showError ? errorMessage : undefined}
									/>

									<Divider />

									<Title level={5}>Accessibility Features</Title>
									<Paragraph>
										This component includes ARIA attributes for improved accessibility.
										Try navigating with keyboard only (Tab, arrows, Enter).
									</Paragraph>
									<CustomSelect
										placeholder="Navigate with keyboard..."
										value={singleSelectValue}
										onChange={(value): void => {
											console.log('Accessibility', value);
											setSingleSelectValue(value as string);
										}}
										options={getOptions(basicData.options)}
										onSearch={handleSearch}
										loading={loading}
										errorMessage={showError ? errorMessage : undefined}
									/>
								</Space>
							</Card>
						</Col>

						<Col span={24}>
							<Card title="State Handling" className="demo-card">
								<Row gutter={[24, 24]}>
									<Col span={8}>
										<Title level={5}>Loading State</Title>
										<Paragraph>Shows a loading spinner during data fetching.</Paragraph>
										<CustomSelect
											placeholder="Loading state demo..."
											value={singleSelectValue}
											onChange={(value): void => {
												console.log('Loading State', value);
												setSingleSelectValue(value as string);
											}}
											options={getOptions(basicData.options)}
											onSearch={handleSearch}
											loading
										/>
									</Col>

									<Col span={8}>
										<Title level={5}>Error State</Title>
										<Paragraph>
											Displays error message in dropdown footer with visual indicators.
										</Paragraph>
										<CustomSelect
											placeholder="Error state demo..."
											value={singleSelectValue}
											onChange={(value): void => {
												console.log('Error State', value);
												setSingleSelectValue(value as string);
											}}
											options={getOptions(basicData.options)}
											onSearch={handleSearch}
											errorMessage="Unable to fetch data. Please try again."
										/>
									</Col>

									<Col span={8}>
										<Title level={5}>No Data State</Title>
										<Paragraph>Shows a message when no options are available.</Paragraph>
										<CustomSelect
											placeholder="No data state demo..."
											value={singleSelectValue}
											onChange={(value): void => {
												console.log('No Data State', value);
												setSingleSelectValue(value as string);
											}}
											options={[]}
											onSearch={handleSearch}
											noDataMessage="No matching options found"
										/>
									</Col>
								</Row>
							</Card>
						</Col>
					</Row>
				</TabPane>

				<TabPane tab="Multi Select" key="multi">
					<Row gutter={[24, 24]}>
						<Col span={12}>
							<Card title="Basic Features" className="demo-card">
								<Space direction="vertical" style={{ width: '100%' }}>
									<Title level={5}>Standard Usage</Title>
									<Paragraph>
										Basic multi-select component allowing selection of multiple values.
									</Paragraph>
									<CustomMultiSelect
										placeholder="Select multiple values..."
										value={multiSelectValue}
										onChange={(value): void => {
											console.log('Basic Multi Usage', value);
											setMultiSelectValue(value as string[]);
										}}
										options={getOptions(basicData.options)}
										onSearch={handleSearch}
										loading={loading}
										customStatusText={showError ? errorMessage : undefined}
									/>

									<Divider />

									<Title level={5}>With Related/All Values</Title>
									<Paragraph>
										Multi-select with &quot;Related&quot; and &quot;All&quot; sections for
										quick filtering.
									</Paragraph>
									<CustomMultiSelect
										placeholder="With related and all values..."
										value={multiSelectValue}
										onChange={(value): void => {
											console.log('With Related/All', value);
											setMultiSelectValue(value as string[]);
										}}
										relatedValues={basicData.relatedValues}
										allValues={basicData.allValues}
										options={getOptions(basicData.options)}
										onSearch={handleSearch}
										loading={loading}
										customStatusText={showError ? errorMessage : undefined}
									/>

									<Divider />

									<Title level={5}>With Token Separators</Title>
									<Paragraph>
										Supports automatic tokenization with specified separators. Try pasting
										comma-separated values or typing with commas.
									</Paragraph>
									<CustomMultiSelect
										placeholder="Type with commas..."
										value={multiSelectValue}
										onChange={(value): void => {
											console.log('With Token Separators', value);
											setMultiSelectValue(value as string[]);
										}}
										options={getOptions(basicData.options)}
										onSearch={handleSearch}
										loading={loading}
										customStatusText={showError ? errorMessage : undefined}
										tokenSeparators={[',']}
									/>
								</Space>
							</Card>
						</Col>

						<Col span={12}>
							<Card title="Advanced Features" className="demo-card">
								<Space direction="vertical" style={{ width: '100%' }}>
									<Title level={5}>Large Dataset with Scrolling</Title>
									<Paragraph>
										Multi-select with large datasets and smooth scrolling.
									</Paragraph>
									<CustomMultiSelect
										placeholder="Search in large dataset..."
										value={multiSelectValue}
										onChange={(value): void => {
											console.log('Large Dataset Multi', value);
											setMultiSelectValue(value as string[]);
										}}
										relatedValues={largeData.relatedValues}
										allValues={largeData.allValues}
										options={getOptions(largeData.options)}
										onSearch={handleSearch}
										loading={loading}
										customStatusText={showError ? errorMessage : undefined}
									/>

									<Divider />

									<Title level={5}>With Max Tag Count</Title>
									<Paragraph>
										Limits the number of visible selections with a +N indicator. Select
										multiple options to see this in action.
									</Paragraph>
									<CustomMultiSelect
										placeholder="Select multiple items..."
										value={multiSelectValue}
										onChange={(value): void => {
											console.log('With Max Tag Count', value);
											setMultiSelectValue(value as string[]);
										}}
										options={getOptions(basicData.options)}
										onSearch={handleSearch}
										loading={loading}
										customStatusText={showError ? errorMessage : undefined}
										maxTagCount={2}
										maxTagPlaceholder={(omittedValues): React.ReactNode => (
											<Tooltip title={omittedValues.map(({ value }) => value).join(', ')}>
												<span>+{omittedValues.length} more</span>
											</Tooltip>
										)}
									/>

									<Divider />

									<Title level={5}>Custom Value Support</Title>
									<Paragraph>
										Type something that doesn&apos;t match any option and press Enter to
										add a custom value.
									</Paragraph>
									<CustomMultiSelect
										placeholder="Type custom values..."
										value={multiSelectValue}
										onChange={(value): void => {
											console.log('Custom Value Multi', value);
											setMultiSelectValue(value as string[]);
										}}
										options={getOptions(basicData.options)}
										onSearch={handleSearch}
										loading={loading}
										customStatusText={showError ? errorMessage : undefined}
									/>
								</Space>
							</Card>
						</Col>

						<Col span={24}>
							<Card title="State Handling" className="demo-card">
								<Row gutter={[24, 24]}>
									<Col span={8}>
										<Title level={5}>Loading State</Title>
										<Paragraph>Shows a loading spinner during data fetching.</Paragraph>
										<CustomMultiSelect
											placeholder="Loading state demo..."
											value={multiSelectValue}
											onChange={(value): void => {
												console.log('Loading State Multi', value);
												setMultiSelectValue(value as string[]);
											}}
											options={getOptions(basicData.options)}
											onSearch={handleSearch}
											loading
										/>
									</Col>

									<Col span={8}>
										<Title level={5}>Error State</Title>
										<Paragraph>
											Displays error message in dropdown footer with visual indicators.
										</Paragraph>
										<CustomMultiSelect
											placeholder="Error state demo..."
											value={multiSelectValue}
											onChange={(value): void => {
												console.log('Error State Multi', value);
												setMultiSelectValue(value as string[]);
											}}
											options={getOptions(basicData.options)}
											onSearch={handleSearch}
											customStatusText="Unable to fetch data. Please try again."
										/>
									</Col>

									<Col span={8}>
										<Title level={5}>No Data State</Title>
										<Paragraph>Shows a message when no options are available.</Paragraph>
										<CustomMultiSelect
											placeholder="No data state demo..."
											value={multiSelectValue}
											onChange={(value): void => {
												console.log('No Data State Multi', value);
												setMultiSelectValue(value as string[]);
											}}
											options={[]}
											onSearch={handleSearch}
											noDataMessage="No matching options found"
										/>
									</Col>
								</Row>
							</Card>
						</Col>
					</Row>
				</TabPane>

				<TabPane tab="Accessibility Features" key="accessibility">
					<Row gutter={[24, 24]}>
						<Col span={24}>
							<Card title="Accessibility Features" className="demo-card">
								<Title level={5}>Keyboard Navigation Demo</Title>
								<Paragraph>
									Click on the select below and try navigating with keyboard only:
								</Paragraph>
								<Row gutter={[24, 24]}>
									<Col span={12}>
										<CustomSelect
											placeholder="Navigate with keyboard..."
											value={singleSelectValue}
											onChange={(value): void => {
												console.log('Keyboard Nav', value);
												setSingleSelectValue(value as string);
											}}
											options={newFormatOptions}
											onSearch={handleSearch}
										/>
										<Paragraph style={{ marginTop: '16px' }}>
											<Text strong>Try these keys:</Text>
											<ul>
												<li>Up/Down Arrows: Move through options</li>
												<li>Tab/Shift+Tab: Same as arrows</li>
												<li>Enter/Space: Select the focused option</li>
												<li>Escape: Close dropdown</li>
											</ul>
										</Paragraph>
									</Col>
									<Col span={12}>
										<CustomMultiSelect
											placeholder="Multi-select keyboard navigation..."
											value={multiSelectValue}
											onChange={(value): void => {
												console.log('Keyboard Nav Multi', value);
												setMultiSelectValue(value as string[]);
											}}
											options={
												newFormatOptions
													.map((option) => {
														if ('options' in option && Array.isArray(option.options)) {
															return {
																...option,
																options: option.options.map((subOption) => ({
																	...subOption,
																	value: subOption.value || '',
																})),
															};
														}
														return {
															...option,
															value: option.value || '',
														};
													})
													.filter((option) => !('options' in option)) as any
											}
											onSearch={handleSearch}
										/>
										<Paragraph style={{ marginTop: '16px' }}>
											Notice that when using keyboard navigation:
											<ul>
												<li>The active option is automatically scrolled into view</li>
												<li>Focus is visually indicated</li>
												<li>Screen readers announce the currently focused option</li>
											</ul>
										</Paragraph>
									</Col>
								</Row>
							</Card>
						</Col>
					</Row>
				</TabPane>
			</Tabs>
		</div>
	);
}

export default NewSelectDemo;
