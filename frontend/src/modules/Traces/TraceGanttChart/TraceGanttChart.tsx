import './TraceGanttChart.css';

import { Button, Col,Progress, Row, Table, Tabs } from 'antd';
import { has,isEmpty, max } from 'lodash-es';
import traverseTreeData from 'modules/Traces/TraceGanttChart/TraceGanttChartHelpers';
import React, { useEffect, useRef, useState } from 'react';
import { pushDStree } from 'store/actions';
import styled from 'styled-components';

const { TabPane } = Tabs;

const StyledButton = styled(Button)`
	border: 1px solid #e0e0e0;
	border-radius: 4px;
	color: #f2f2f2;
	font-size: 14px;
	line-height: 20px;
`;

interface TraceGanttChartProps {
	treeData: pushDStree[];
	clickedSpan: pushDStree;
	selectedSpan: pushDStree;
	resetZoom: (value: boolean) => {};
	setSpanTagsInfo: (p: { data: any }) => {};
}

const TraceGanttChart = ({
	treeData,
	clickedSpan,
	selectedSpan,
	resetZoom,
	setSpanTagsInfo,
}: TraceGanttChartProps) => {
	const checkStrictly = true;
	const [selectedRows, setSelectedRows] = useState<string[]>([]);
	const [clickedSpanData, setClickedSpanData] = useState(clickedSpan);
	const [defaultExpandedRows, setDefaultExpandedRows] = useState<string[]>([]);
	const [sortedTreeData, setSortedTreeData] = useState(treeData);
	const [isReset, setIsReset] = useState(false);
	const [tabsContainerWidth, setTabsContainerWidth] = useState(0);
	const tableRef = useRef('');
	const tabsContainer = document.querySelector<HTMLElement>(
		'#collapsable .ant-tabs-nav-list',
	);

	const tabs = document.querySelectorAll('#collapsable .ant-tabs-tab');

	const { id } = treeData || 'id';
	let maxGlobal = 0;
	let minGlobal = 0;
	let medianGlobal = 0;
	const endTimeArray: [] = [];

	useEffect(() => {
		if (id !== 'empty') {
			setSortedTreeData(treeData);
			if (clickedSpan) {
				setClickedSpanData(clickedSpan);
			}
			if (tabsContainer) {
				setTabsContainerWidth(tabsContainer.offsetWidth);
			}
		}
		handleScroll(selectedSpan?.id);
	}, [sortedTreeData, treeData, clickedSpan]);

	useEffect(() => {
		if (
			!isEmpty(clickedSpanData) &&
			clickedSpan &&
			!selectedRows.includes(clickedSpan.id) &&
			!isReset
		) {
			setSelectedRows([clickedSpan.id]);
			getParentKeys(clickedSpan);
			handleFocusOnSelectedPath('', [clickedSpan.id]);
		}
	}, [clickedSpan, selectedRows, isReset, clickedSpanData]);

	const parentKeys: string[] = [];
	const childrenKeys: string[] = [];

	const getParentKeys = (obj) => {
		if (has(obj, 'parent')) {
			parentKeys.push(obj.parent.id);
			getParentKeys(obj.parent);
		}
	};

	const getChildrenKeys = (obj: pushDStree) => {
		if (has(obj, 'children')) {
			childrenKeys.push(obj.id);
			if (!isEmpty(obj.children)) {
				obj.children.map((item) => {
					getChildrenKeys(item);
				});
			}
		}
	};

	useEffect(() => {
		if (!isEmpty(selectedSpan) && isEmpty(clickedSpan)) {
			getParentKeys(selectedSpan);
			const keys = [selectedSpan?.id, ...parentKeys];
			setDefaultExpandedRows(keys);
			setSelectedRows([selectedSpan.id, clickedSpan]);
			// setSpanTagsInfo({data: selectedSpan})
		} else {
			setSelectedRows([treeData?.[0]?.id]);
			setDefaultExpandedRows([treeData?.[0]?.id]);
			// /.setSpanTagsInfo({data: treeData?.[0]})
		}
	}, [selectedSpan, treeData, clickedSpan]);

	const getMaxEndTime = (treeData) => {
		if (treeData.length > 0) {
			if (treeData?.id !== 'empty') {
				return Array.from(treeData).map((item, key) => {
					if (!isEmpty(item.children)) {
						endTimeArray.push(item.time / 1000000 + item.startTime);
						getMaxEndTime(item.children);
					} else {
						endTimeArray.push(item.time / 1000000 + item.startTime);
					}
				});
			}
		}
	};

	if (id !== 'empty') {
		getMaxEndTime(treeData);
		maxGlobal = max(endTimeArray);
		minGlobal = treeData?.[0]?.startTime;
		medianGlobal = (minGlobal + maxGlobal) / 2;
	}

	/*
	timeDiff = maxGlobal - startTime
	totalTime = maxGlobal - minGlobal
	totalWidth = width of container
	 */
	const getPaddingLeft = (timeDiff, totalTime, totalWidth) => {
		return ((timeDiff / totalTime) * totalWidth).toFixed(0);
	};

	const tabMinVal = 0;
	const tabMedianVal = (medianGlobal - minGlobal).toFixed(0);
	const tabMaxVal = (maxGlobal - minGlobal).toFixed(0);

	const columns = [
		{
			title: '',
			dataIndex: 'name',
			key: 'name',
		},
		{
			title: (
				<Tabs>
					<TabPane tab={tabMinVal + 'ms'} key="1" />
					<TabPane tab={tabMedianVal + 'ms'} key="2" />
					<TabPane tab={tabMaxVal + 'ms'} key="3" />
				</Tabs>
			),
			dataIndex: 'trace',
			name: 'trace',
			render: (_, record: pushDStree) => {
				const widths = [];
				let length;

				if (widths.length < tabs.length) {
					Array.from(tabs).map((tab) => {
						widths.push(tab.offsetWidth);
					});
				}

				let paddingLeft = 0;
				const startTime = parseFloat(record.startTime.toString());
				const duration = parseFloat((record.time / 1000000).toFixed(2));
				paddingLeft = parseInt(
					getPaddingLeft(
						startTime - minGlobal,
						maxGlobal - minGlobal,
						tabsContainerWidth,
					),
				);
				let textPadding = paddingLeft;
				if (paddingLeft === tabsContainerWidth - 20) {
					textPadding = tabsContainerWidth - 40;
				}
				length = ((duration / (maxGlobal - startTime)) * 100).toFixed(2);

				return (
					<>
						<div style={{ paddingLeft: textPadding + 'px' }}>{duration}ms</div>
						<Progress
							percent={length}
							showInfo={false}
							style={{ paddingLeft: paddingLeft + 'px' }}
						/>
					</>
				);
			},
		},
	];

	const handleFocusOnSelectedPath = (event, selectedRowsList = selectedRows) => {
		if (!isEmpty(selectedRowsList)) {
			// initializing the node
			let node: pushDStree = {
				children: [],
				id: '',
				name: '',
				startTime: 0,
				tags: [],
				time: 0,
				value: 0,
			};

			traverseTreeData(treeData, (item: pushDStree) => {
				if (item.id === selectedRowsList[0]) {
					node = item;
				}
			});

			try {
				setSpanTagsInfo({ data: node });
			} catch (e) {
				// TODO: error logging.
				console.error('Node not found in Tree Data.');
			}

			// get the parent of the node
			getParentKeys(node);

			// get the children of the node
			getChildrenKeys(node);

			const rows = document.querySelectorAll('#collapsable table tbody tr');
			rows.forEach((row) => {
				const attribKey = row.getAttribute('data-row-key') || '';
				if (
					!isEmpty(attribKey) &&
					!selectedRowsList.includes(attribKey) &&
					!childrenKeys.includes(attribKey)
				) {
					row.classList.add('hide');
				}
			});
			setDefaultExpandedRows([...parentKeys, ...childrenKeys]);
		}
	};

	const handleResetFocus = () => {
		const rows = document.querySelectorAll('#collapsable table tbody tr');
		rows.forEach((row) => {
			row.classList.remove('hide');
		});

		resetZoom(true);
	};

	const handleScroll = (id: string): void => {
		if (!isEmpty(id)) {
			const selectedRow = document.querySelectorAll<HTMLElement>(
				`[data-row-key='${id}']`,
			);
			selectedRow?.[0]?.scrollIntoView();
		}
	};

	const rowSelection = {
		onChange: (selectedRowKeys: []) => {
			setSelectedRows(selectedRowKeys);
			setClickedSpanData({});
			if (isEmpty(selectedRowKeys)) {
				setIsReset(true);
			} else {
				setIsReset(false);
			}
		},
		onSelect: (record: pushDStree) => {
			handleRowOnClick(record);
		},
		selectedRowKeys: selectedRows,
	};

	const handleRowOnClick = (record: pushDStree) => {
		let node = {};
		traverseTreeData(treeData, (item: pushDStree) => {
			if (item.id === record.id) {
				node = item;
			}
		});

		try {
			setSpanTagsInfo({ data: node });
		} catch (e) {
			// TODO: error logging.
			console.error('Node not found in TreeData.');
		}

		const selectedRowKeys = selectedRows;
		if (selectedRowKeys.indexOf(record.id) >= 0) {
			selectedRowKeys.splice(selectedRowKeys.indexOf(record.key), 1);
		} else {
			selectedRowKeys.push(record.id);
		}
		setSelectedRows([record.id]);
	};

	const handleOnExpandedRowsChange = (item: string[]) => {
		setDefaultExpandedRows(item);
	};

	return (
		<>
			{id !== 'empty' && (
				<>
					<Row
						justify="end"
						gutter={32}
						style={{
							marginBottom: '24px',
						}}
					>
						<Col>
							<StyledButton onClick={handleFocusOnSelectedPath}>
								Focus on selected path
							</StyledButton>
						</Col>
						<Col>
							<StyledButton onClick={handleResetFocus}> Reset Focus </StyledButton>
						</Col>
					</Row>

					<Table
						refs={tableRef}
						hideSelectAll={true}
						columns={columns}
						rowSelection={{ ...rowSelection, checkStrictly, type: 'radio' }}
						dataSource={sortedTreeData}
						rowKey="id"
						sticky={true}
						onRow={(record) => {
							return {
								onClick: () => handleRowOnClick(record), // click row
							};
						}}
						onExpandedRowsChange={(keys) =>
							handleOnExpandedRowsChange(keys.map((e) => e.toString()))
						}
						pagination={false}
						expandable={{
							expandedRowKeys: defaultExpandedRows,
						}}
						scroll={{ y: 540 }}
						rowClassName="row-styles"
						filterMultiple={false}
					/>
				</>
			)}
		</>
	);
};

export default TraceGanttChart;
