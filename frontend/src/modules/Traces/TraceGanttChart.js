import React, { useEffect, useRef, useState } from "react";
import { Table, Progress, Tabs, Button, Row, Col } from "antd";
import "./Collapse.css";
import { max, isEmpty, has } from "lodash-es";
import styled from "styled-components";

const { TabPane } = Tabs;

const StyledButton = styled(Button)`
	border: 1px solid #E0E0E0;
	border-radius: 4px;
	color: #F2F2F2;
	font-size: 14px;
 line-height: 20px;
`;

const TraceGanttChart = ({ treeData, clickedSpan, selectedSpan = {} }) => {
	let checkStrictly = false;
	const [selectedRows, setSelectedRows] = useState([]);
	const [defaultExpandedRows, setDefaultExpandedRows] = useState([]);
	const [sortedTreeData, setSortedTreeData] = useState(treeData);
	const [rowId, setRowId] = useState(0);
	const tableRef = useRef("");
	
	console.log("clickedSpan", treeData, selectedSpan, !isEmpty(selectedSpan));
	
	const { id } = treeData || "id";
	let maxGlobal = 0;
	let minGlobal = 0;
	let medianGlobal = 0;
	let endTimeArray = [];
	
	useEffect(() => {
		if (id !== "empty") {
			setSortedTreeData(treeData);
		}
		if (clickedSpan) {
			handleRowOnClick(clickedSpan);
		}
		handleScroll(selectedSpan?.id)
	}, [sortedTreeData, treeData, clickedSpan]);
	
	let parentKeys = [];
	const getParentKeys = (obj) => {
		if (has(obj, "parent")) {
			parentKeys.push(obj.parent.id);
			getParentKeys(obj.parent);
		}
	};
	
	useEffect(() => {
		if (!isEmpty(selectedSpan)) {
			getParentKeys(selectedSpan);
			let keys = [selectedSpan?.id, ...parentKeys];
			setDefaultExpandedRows(keys);
			setSelectedRows([selectedSpan.id]);
		}
	}, [selectedSpan]);
	
	
	const getMaxEndTime = (treeData) => {
		if (treeData.length > 0) {
			let data = treeData[0];
			if (data?.id !== "empty") {
				return Array.from(data).map((item, key) => {
					if (!isEmpty(item.children)) {
						endTimeArray.push((item.time / 1000000) + item.startTime);
						getMaxEndTime(item.children);
					} else {
						endTimeArray.push((item.time / 1000000) + item.startTime);
					}
				});
			}
		}
	};
	
	if (id !== "empty") {
		getMaxEndTime(treeData);
		maxGlobal = max(endTimeArray);
		minGlobal = treeData?.[0]?.startTime;
		medianGlobal = (minGlobal + maxGlobal) / 2;
	}
	
	const getPaddingLeft = (value, totalWidth, leftOffset = 0) => {
		return (((value / totalWidth) * 100) + leftOffset).toFixed(0);
	};
	
	let tabMinVal = 0;
	let tabMedianVal = (medianGlobal - minGlobal).toFixed(0);
	let tabMaxVal = (maxGlobal - minGlobal).toFixed(0);
	
	const columns = [
		{
			title: "",
			dataIndex: "name",
			key: "name",
		},
		{
			title:
				<Tabs>
					<TabPane tab={tabMinVal + "ms"} key="1" />
					<TabPane tab={tabMedianVal + "ms"} key="2" />
					<TabPane tab={tabMaxVal + "ms"} key="3" />
				</Tabs>,
			dataIndex: "trace",
			name: "trace",
			render: (_, record) => {
				let tabs = document.querySelectorAll("#collapsable .ant-tabs-tab");
				let tabsContainerWidth = document.querySelector("#collapsable .ant-tabs-nav-list")?.offsetWidth;
				let widths = [];
				let length;
				
				if (widths.length < tabs.length) {
					Array.from(tabs).map((tab) => {
						widths.push(tab.offsetWidth);
					});
				}
				
				let paddingLeft = 0;
				let startTime = record.startTime;
				let duration = (record.time / 1000000).toFixed(2);
				
				if (startTime < medianGlobal) {
					paddingLeft = getPaddingLeft(startTime - minGlobal, tabsContainerWidth);
				} else if (startTime >= medianGlobal && startTime < maxGlobal) {
					paddingLeft = getPaddingLeft(widths[0] + (startTime - medianGlobal), tabsContainerWidth, tabs[1].offsetLeft);
				}
				
				length = (((record.time / 1000000) / (maxGlobal - minGlobal)) * 100).toFixed(2);
				
				return (
					<>
						<div style={{ paddingLeft: paddingLeft + "px" }}>{duration}ms</div>
						<Progress percent={length} showInfo={false} style={{ paddingLeft: paddingLeft + "px" }} />
					</>
				);
			},
		},
	];
	
	
	const handleFocusOnSelectedPath = () => {
		let rows = document.querySelectorAll("#collapsable table tbody tr");
		Array.from(rows).map((row) => {
			let attribKey = row.getAttribute("data-row-key");
			if (!selectedRows.includes(attribKey)) {
				row.classList.add("hide");
			}
		});
	};
	
	const handleResetFocus = () => {
		let rows = document.querySelectorAll("#collapsable table tbody tr");
		Array.from(rows).map((row) => {
			row.classList.remove("hide");
		});
	};
	
	const handleScroll = (id) =>{
		let rows = document.querySelectorAll("#collapsable table tbody tr");
		const table = document.querySelectorAll("#collapsable table")
		Array.from(rows).map((row) => {
			let attribKey = row.getAttribute("data-row-key");
			if (id === attribKey) {
				console.log("row.offsetTop", row.offsetTop, table[1].offsetHeight)
				let scrollValue = table[1].offsetTop - row.offsetHeight
					table[1].scrollTop = scrollValue;
			}
		});
	}
	
	const rowSelection = {
		onChange: (selectedRowKeys, selectedRows) => {
			console.log("selectedRowKeys", selectedRowKeys, selectedRows)
			setSelectedRows(selectedRowKeys);
		},
		selectedRowKeys: selectedRows
	};
	
	const handleRowOnClick = (record) => {
		setRowId(record.id);
		
		const selectedRowKeys = selectedRows;
		if (selectedRowKeys.indexOf(record.id) >= 0) {
			selectedRowKeys.splice(selectedRowKeys.indexOf(record.key), 1);
		} else {
			selectedRowKeys.push(record.id);
		}
		setSelectedRows(selectedRowKeys);
	};
	
	const setRowClassName = (record) => {
		return record.id === rowId ? "selectedRowStyles" : "";
	};
	
	const handleOnExpandedRowsChange = (item) =>{
		setDefaultExpandedRows(item);
	}
	
	
	return (
		<>
			{id !== "empty" && (
				<>
					<Row justify="end" gutter={32} style={{
						marginBottom: "24px",
					}}>
						<Col>
							<StyledButton onClick={handleFocusOnSelectedPath}> Focus on selected path </StyledButton>
						</Col>
						<Col>
							<StyledButton onClick={handleResetFocus}> Reset Focus </StyledButton>
						</Col>
					</Row>
					
					<Table
						refs={tableRef}
						checkStrictly={true}
						hideSelectAll={true}
						columns={columns}
						rowSelection={{ ...rowSelection, checkStrictly }}
						dataSource={sortedTreeData}
						rowKey="id"
						sticky={true}
						onRow={(record, rowIndex) => {
							return {
								onClick: () => handleRowOnClick(record, rowIndex), // click row
							};
						}}
						rowClassName={setRowClassName}
						expandedRowKeys={defaultExpandedRows}
						onExpandedRowsChange={handleOnExpandedRowsChange}
						scroll={{ y: 640 }}
						pagination={false} />
				</>
			)
			}
		</>
	);
};

export default TraceGanttChart;