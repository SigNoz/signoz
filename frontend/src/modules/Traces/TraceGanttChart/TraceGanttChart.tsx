import React, { useEffect, useRef, useState } from "react";
import { Button, Col, Progress, Row, Table, Tabs } from "antd";
import "./TraceGanttChart.css";
import { has, isEmpty } from "lodash-es";
import styled from "styled-components";
import { pushDStree } from "Src/store/actions";
import {
	emptyTreeObj,
	extendedEmptyObj,
	getPaddingLeft,
	getParentKeys,
	traverseTreeData,
} from "Src/modules/Traces/TraceGanttChart/TraceGanttChartHelpers";
import { Key } from "antd/lib/table/interface";

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
	resetZoom: (value: React.SetStateAction<boolean>) => void;
	setSpanTagsInfo: (p: { data: any }) => void;
	globalEndTime: number;
}

interface recordProps extends pushDStree {
	key: string;
}

const TraceGanttChart = ({
	treeData,
	clickedSpan,
	selectedSpan,
	resetZoom,
	setSpanTagsInfo,
	globalEndTime,
}: TraceGanttChartProps) => {
	let checkStrictly = true;
	const [selectedRows, setSelectedRows] = useState<Key[]>([]);
	const [clickedSpanData, setClickedSpanData] = useState<pushDStree>(
		clickedSpan,
	);
	const [defaultExpandedRows, setDefaultExpandedRows] = useState<Key[]>([]);
	const [sortedTreeData, setSortedTreeData] = useState(treeData);
	const [isReset, setIsReset] = useState(false);
	const [tabsContainerWidth, setTabsContainerWidth] = useState(0);
	let tabsContainer = document.querySelector<HTMLElement>(
		"#collapsable .ant-tabs-nav-list",
	);
	let tabs = document.querySelectorAll<HTMLElement>(
		"#collapsable .ant-tabs-tab",
	);

	const { id } = treeData[0];
	let globalStartTime = 0;
	let globalMedianTime = 0;
	let childrenKeys: string[] = [];

	if (id !== "empty") {
		globalStartTime = treeData?.[0]?.startTime;
		globalMedianTime = (globalStartTime + globalEndTime) / 2;
	}

	useEffect(() => {
		if (id !== "empty") {
			setSortedTreeData(treeData);
			if (clickedSpan) {
				setClickedSpanData(clickedSpan);
			}
			setTabsContainerWidth(tabsContainer?.offsetWidth!);
		}
	}, [sortedTreeData, treeData, clickedSpan]);

	useEffect(() => {
		if (
			!isEmpty(clickedSpanData) &&
			clickedSpan &&
			!selectedRows.includes(clickedSpan.id) &&
			!isReset
		) {
			setSelectedRows([clickedSpan.id]);
			// getParentKeys(clickedSpan, []);

			focusSelectedPath([clickedSpan.id]);
		}
	}, [clickedSpan, selectedRows, isReset, clickedSpanData]);

	const getChildrenKeys = (obj: pushDStree) => {
		if (has(obj, "children")) {
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
			const parentKeys = getParentKeys(selectedSpan, []);
			let keys = [selectedSpan?.id, ...parentKeys];
			setDefaultExpandedRows(keys);
			setSelectedRows([selectedSpan.id]);
			setSpanTagsInfo({ data: selectedSpan });
		} else {
			setSelectedRows([treeData?.[0]?.id]);
			setDefaultExpandedRows([treeData?.[0]?.id]);
			setSpanTagsInfo({ data: treeData?.[0] });
		}
	}, [selectedSpan, treeData]);

	let tabMinVal = 0;
	let tabMedianVal = (globalMedianTime - globalStartTime).toFixed(0);
	let tabMaxVal = (globalEndTime - globalStartTime).toFixed(0);

	const columns = [
		{
			title: "",
			dataIndex: "name",
			key: "name",
		},
		{
			title: (
				<Tabs>
					<TabPane tab={tabMinVal + "ms"} key="1" />
					<TabPane tab={tabMedianVal + "ms"} key="2" />
					<TabPane tab={tabMaxVal + "ms"} key="3" />
				</Tabs>
			),
			dataIndex: "trace",
			name: "trace",
			render: (_, record: pushDStree) => {
				let widths = [];
				let length;

				if (widths.length < tabs.length) {
					Array.from(tabs).map((tab) => {
						widths.push(tab?.offsetWidth);
					});
				}

				let paddingLeft = 0;
				let startTime = parseFloat(String(record.startTime));
				let duration = parseFloat((record.time / 1000000).toFixed(2));
				paddingLeft = getPaddingLeft(
					startTime - globalStartTime,
					globalEndTime - globalStartTime,
					tabsContainerWidth,
				);

				let textPadding = paddingLeft;
				if (paddingLeft === tabsContainerWidth - 20) {
					textPadding = tabsContainerWidth - 40;
				}
				length = parseFloat(
					((duration / (globalEndTime - startTime)) * 100).toFixed(2),
				);

				return (
					<>
						<div style={{ paddingLeft: textPadding + "px" }}>{duration}ms</div>
						<Progress
							percent={length}
							showInfo={false}
							style={{ paddingLeft: paddingLeft + "px" }}
						/>
					</>
				);
			},
		},
	];

	const focusSelectedPath = (selectedRowsList: Key[]) => {
		if (!isEmpty(selectedRowsList)) {
			let node = extendedEmptyObj;

			// get selected row data
			traverseTreeData(treeData, (item: pushDStree) => {
				if (item.id === selectedRowsList[0]) {
					node = item;
				}
			});

			try {
				// show span data for the selected row
				setSpanTagsInfo({ data: node });
			} catch (e) {
				// TODO: error logging.
				console.error("Node not found in Tree Data.");
			}

			// get parent keys of the selected node
			const parentKeys = getParentKeys(node, []);

			// get children keys of the selected node
			getChildrenKeys(node);

			let rows = document.querySelectorAll("#collapsable table tbody tr");
			Array.from(rows).map((row) => {
				let attribKey = row.getAttribute("data-row-key") || "";
				if (!isEmpty(attribKey) && !selectedRowsList.includes(attribKey)) {
					row.classList.add("hide");
				}
			});
			setDefaultExpandedRows([...parentKeys, ...childrenKeys]);
		}
	};

	const handleFocusOnSelectedPath = (
		event: React.SyntheticEvent,
		selectedRowsList = selectedRows,
	) => {
		focusSelectedPath(selectedRowsList);
	};

	const handleResetFocus = () => {
		let rows = document.querySelectorAll("#collapsable table tbody tr");
		Array.from(rows).map((row) => {
			row.classList.remove("hide");
		});

		resetZoom(true);
	};

	const rowSelection = {
		onChange: (selectedRowKeys: Key[]) => {
			setSelectedRows(selectedRowKeys);
			setClickedSpanData(emptyTreeObj);
			if (isEmpty(selectedRowKeys)) {
				setIsReset(true);
			} else {
				setIsReset(false);
			}
		},
		onSelect: (record: recordProps) => {
			handleRowOnClick(record);
		},
		selectedRowKeys: selectedRows,
	};

	const handleRowOnClick = (record: recordProps) => {
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
			console.error("Node not found in TreeData.");
		}

		const selectedRowKeys = selectedRows;
		if (selectedRowKeys.indexOf(record.id) >= 0) {
			selectedRowKeys.splice(selectedRowKeys.indexOf(record.key), 1);
		} else {
			selectedRowKeys.push(record.id);
		}
		setSelectedRows([record.id]);
	};

	const handleOnExpandedRowsChange = (expandedKeys: Key[]) => {
		setDefaultExpandedRows(expandedKeys);
	};

	return (
		<>
			{id !== "empty" && (
				<>
					<Row
						justify="end"
						gutter={32}
						style={{
							marginBottom: "24px",
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
						hideSelectAll={true}
						columns={columns}
						rowSelection={{ ...rowSelection, checkStrictly, type: "radio" }}
						dataSource={sortedTreeData}
						rowKey="id"
						sticky={true}
						onRow={(record) => {
							return {
								onClick: () => handleRowOnClick(record), // click row
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
