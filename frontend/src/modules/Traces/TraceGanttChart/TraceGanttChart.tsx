import React, { useEffect, useRef, useState } from 'react';
import { Table, Progress, Tabs, Button, Row, Col } from 'antd';
import './TraceGanttChart.css';
import { max, isEmpty, has } from 'lodash-es';
import styled from 'styled-components';
import { pushDStree } from 'Src/store/actions';
import traverseTreeData from 'Src/modules/Traces/TraceGanttChart/TraceGanttChartHelpers';

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
	resetZoom: () => {};
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
	const [selectedRows, setSelectedRows] = useState([]);
	const [clickedSpanData, setClickedSpanData] = useState(clickedSpan);
	const [defaultExpandedRows, setDefaultExpandedRows] = useState([]);
	const [sortedTreeData, setSortedTreeData] = useState(treeData);
	const [isReset, setIsReset] = useState(false);
	const [tabsContainerWidth, setTabsContainerWidth] = useState(0);
	const tableRef = useRef('');
	const tabsContainer = document.querySelector('#collapsable .ant-tabs-nav-list');

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
			setTabsContainerWidth(tabsContainer?.offsetWidth);
		}
		// handleScroll(selectedSpan?.id);
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
			handleFocusOnSelectedPath('', [clickedSpan.id], clickedSpan);
		}
	}, [clickedSpan, selectedRows, isReset, clickedSpanData]);

	const parentKeys = [];
	const childrenKeys = [];
	const getParentKeys = (obj) => {
		if (has(obj, 'parent')) {
			parentKeys.push(obj.parent.id);
			getParentKeys(obj.parent);
		}
	};

	const getChildrenKeys = (obj) => {
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
	}, [selectedSpan, treeData]);

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
				const startTime = parseFloat(record.startTime);
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
			let node = {};
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

			getParentKeys(node);
			getChildrenKeys(node);

			const rows = document.querySelectorAll('#collapsable table tbody tr');
			Array.from(rows).map((row) => {
				const attribKey = row.getAttribute('data-row-key');
				if (!selectedRowsList.includes(attribKey)) {
					row.classList.add('hide');
				}
			});
			setDefaultExpandedRows([...parentKeys, ...childrenKeys]);
		}
	};

	const handleResetFocus = () => {
		const rows = document.querySelectorAll('#collapsable table tbody tr');
		Array.from(rows).map((row) => {
			row.classList.remove('hide');
		});

		resetZoom(true);
	};

	const handleScroll = (id) => {
		const rows = document.querySelectorAll('#collapsable table tbody tr');
		const table = document.querySelectorAll('#collapsable table');
		Array.from(rows).map((row) => {
			const attribKey = row.getAttribute('data-row-key');
			if (id === attribKey) {
				const scrollValue = row.offsetTop;
				table[1].scrollTop = scrollValue;
			}
		});
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
		onSelect: (record) => {
			handleRowOnClick(record);
		},
		selectedRowKeys: selectedRows,
	};

	const handleRowOnClick = (record) => {
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

	const handleOnExpandedRowsChange = (item) => {
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
								{' '}
								Focus on selected path{' '}
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
						onRow={(record, rowIndex) => {
							return {
								onClick: () => handleRowOnClick(record, rowIndex), // click row
							};
						}}
						expandedRowKeys={defaultExpandedRows}
						onExpandedRowsChange={handleOnExpandedRowsChange}
						pagination={false}
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
