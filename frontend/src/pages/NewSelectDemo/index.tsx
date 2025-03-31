/* eslint-disable sonarjs/no-duplicate-string */
import './styles.scss';

import { Card, Col, Divider, Row, Space, Tooltip, Typography } from 'antd';
import {
	CustomMultiSelect,
	CustomSelect,
	OptionData,
} from 'components/NewSelect';
import { useEffect, useState } from 'react';
import { popupContainer } from 'utils/selectPopupContainer';

const { Title, Paragraph } = Typography;

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
			options: Array(20)
				.fill(0)
				.map((_, i) => ({
					label: `related-value-${i + 1}`,
					value: `related-value-${i + 1}`,
				})),
		},
		allValues: [
			{
				label: 'Kubernetes Pods',
				options: Array(30)
					.fill(0)
					.map((_, i) => ({
						label: `pod-${i + 1}-kubernetes-cluster-production`,
						value: `pod-${i + 1}-kubernetes-cluster-production`,
					})),
			},
			{
				label: 'AWS EC2 Instances',
				options: Array(25)
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
				options: Array(20)
					.fill(0)
					.map((_, i) => ({
						label: `gke-mgmt-pl-generator-e2st4-sp-${Math.random()
							.toString(36)
							.substring(2, 10)}`,
						value: `gcp-vm-${i + 1}`,
					})),
			},
		],
		options: Array(50)
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
];

// const newUnifiedFormat = [
// 	{
// 		label: 'Recently Viewed',
// 		title: 'Recently Viewed',
// 		options: Array(15)
// 			.fill(0)
// 			.map((_, i) => ({
// 				label: `Recent Item ${i + 1}`,
// 				value: `recent-${i + 1}`,
// 			})),
// 	},
// 	{
// 		label: 'Kubernetes Resources',
// 		title: 'Kubernetes Resources',
// 		options: Array(40)
// 			.fill(0)
// 			.map((_, i) => ({
// 				label: `pod-${i + 1}-kubernetes-cluster-production`,
// 				value: `pod-${i + 1}-kubernetes-cluster-production`,
// 			})),
// 	},
// 	{
// 		label: 'AWS Resources',
// 		title: 'AWS Resources',
// 		options: Array(30)
// 			.fill(0)
// 			.map((_, i) => ({
// 				label: `i-${Math.random()
// 					.toString(36)
// 					.substring(2, 10)}.ec2.compute-1.amazonaws.com`,
// 				value: `aws-ec2-${i + 1}`,
// 			})),
// 	},
// 	{
// 		label: 'Google Cloud Resources',
// 		title: 'Google Cloud Resources',
// 		options: Array(25)
// 			.fill(0)
// 			.map((_, i) => ({
// 				label: `gke-mgmt-pl-generator-e2st4-sp-${Math.random()
// 					.toString(36)
// 					.substring(2, 10)}`,
// 				value: `gcp-vm-${i + 1}`,
// 			})),
// 	},
// 	// Some flat options
// 	...Array(10)
// 		.fill(0)
// 		.map((_, i) => ({
// 			label: `Ungrouped Option ${i + 1}`,
// 			value: `ungrouped-${i + 1}`,
// 		})),
// ];

function NewSelectDemo(): JSX.Element {
	const [singleSelectValue, setSingleSelectValue] = useState<string>();
	const [multiSelectValue, setMultiSelectValue] = useState<string[]>([]);
	const [searchText, setSearchText] = useState('');
	const [loading, setLoading] = useState(false);
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

	return (
		<div className="new-select-demo-container">
			<Title level={2}>Custom Select Components</Title>
			<Paragraph>
				These components extend Ant Design&apos;s Select with support for multiple
				sections, scrollable areas, automatic tokenization, and search highlighting.
			</Paragraph>

			<Row gutter={[24, 24]}>
				<Col span={12}>
					<Card title="Single Select" className="demo-card">
						<Space direction="vertical" style={{ width: '100%' }}>
							<Title level={5}>Basic Usage</Title>
							<CustomSelect
								placeholder="Search..."
								value={singleSelectValue}
								onChange={(value): void => {
									console.log('Basic Usage', value);
									setSingleSelectValue(value as string);
								}}
								options={basicData.options}
								onSearch={handleSearch}
								loading={loading}
								title="Basic Usage"
							/>

							<Divider />

							<Title level={5}>With Large Dataset (Good for Scrolling Test)</Title>
							<Paragraph>
								This example has many items in each section to demonstrate scrolling
								behavior
							</Paragraph>
							{/* <CustomSelect
								placeholder="Search..."
								value={singleSelectValue}
								onChange={(value): void => {
									console.log('Large Dataset', value);
									setSingleSelectValue(value as string);
								}}
								options={getFilteredOptions(largeData.options)}
								onSearch={handleSearch}
								loading={loading}
							/> */}

							<Divider />

							<Title level={5}>With No Data</Title>
							<Paragraph>
								When we have no data but previously selected values
							</Paragraph>
							{/* <CustomSelect
								placeholder="Search..."
								value={singleSelectValue}
								onChange={(value): void => {
									console.log(value);
									setSingleSelectValue(value as string);
								}}
								options={[]}
								noDataMessage="No data available"
							/> */}
							<CustomSelect
								key={singleSelectValue}
								defaultValue={singleSelectValue}
								value={singleSelectValue}
								onChange={(value): void => {
									console.log('No Data', value);
									setSingleSelectValue(value as string);
								}}
								placeholder="Select value"
								placement="bottomLeft"
								style={{ minWidth: '120px', width: '100%', fontSize: '0.8rem' }}
								loading={loading}
								showSearch
								data-testid="variable-select"
								className="variable-select"
								popupClassName="dropdown-styles"
								maxTagCount={4}
								getPopupContainer={popupContainer}
								// eslint-disable-next-line react/no-unstable-nested-components
								maxTagPlaceholder={(omittedValues): JSX.Element => (
									<Tooltip title={omittedValues.map(({ value }) => value).join(', ')}>
										<span>+ {omittedValues.length} </span>
									</Tooltip>
								)}
								allowClear
								options={newFormatOptions}
							/>

							<Divider />

							<Title level={5}>With No Related Values</Title>
							<Paragraph>
								When we don&apos;t have any related values, showing all values in a
								plain format
							</Paragraph>
							{/* <CustomSelect
								placeholder="Search..."
								value={singleSelectValue}
								onChange={(value): void => {
									console.log('No Related Values', value);
									setSingleSelectValue(value as string);
								}}
								options={getFilteredOptions(basicData.options)}
								onSearch={handleSearch}
							/> */}
						</Space>
					</Card>
				</Col>

				<Col span={12}>
					<Card title="MultiSelect" className="demo-card">
						<Space direction="vertical" style={{ width: '100%' }}>
							<Title level={5}>Basic Usage</Title>
							<CustomMultiSelect
								placeholder="Search..."
								value={multiSelectValue}
								onChange={(value): void => {
									console.log(value);
									setMultiSelectValue(value as string[]);
								}}
								relatedValues={basicData.relatedValues}
								allValues={basicData.allValues}
								options={getFilteredOptions(basicData.options)}
								onSearch={handleSearch}
								loading={loading}
								customStatusText="We are updating the values..."
							/>

							<Divider />

							<Title level={5}>With Large Dataset (Good for Scrolling Test)</Title>
							<Paragraph>
								This example has many items in each section to demonstrate scrolling
								behavior
							</Paragraph>
							<CustomMultiSelect
								placeholder="Search..."
								value={multiSelectValue}
								onChange={(value): void => {
									console.log(value);
									setMultiSelectValue(value as string[]);
								}}
								relatedValues={largeData.relatedValues}
								allValues={largeData.allValues}
								options={getFilteredOptions(largeData.options)}
								onSearch={handleSearch}
								loading={loading}
							/>

							<Divider />

							<Title level={5}>With No Data</Title>
							<Paragraph>
								When we have no data but previously selected values
							</Paragraph>
							<CustomMultiSelect
								placeholder="Search..."
								value={multiSelectValue}
								onChange={(value): void => {
									console.log(value);
									setMultiSelectValue(value as string[]);
								}}
								options={[]}
								noDataMessage="No data available"
							/>

							<Divider />

							<Title level={5}>With No Related Values</Title>
							<Paragraph>
								When we don&apos;t have any related values, showing all values in a
								plain format
							</Paragraph>
							<CustomMultiSelect
								placeholder="Search..."
								value={multiSelectValue}
								onChange={(value): void => {
									console.log(value);
									setMultiSelectValue(value as string[]);
								}}
								options={getFilteredOptions(basicData.options)}
								onSearch={handleSearch}
							/>
						</Space>
					</Card>
				</Col>
			</Row>
		</div>
	);
}

export default NewSelectDemo;
