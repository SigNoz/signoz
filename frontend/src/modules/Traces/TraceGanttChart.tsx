import React, { useEffect, useRef, useState } from "react";
import { Table, Progress, Tabs, Button, Row, Col } from "antd";
import "./Collapse.css";
import { max, isEmpty, has } from "lodash-es";
import styled from "styled-components";
import getTreeData from "Src/modules/Traces/TraceGantChartHelpers";
import { pushDStree } from "../../store/actions";

const { TabPane } = Tabs;

const StyledButton = styled(Button)`
	border: 1px solid #E0E0E0;
	border-radius: 4px;
	color: #F2F2F2;
	font-size: 14px;
 line-height: 20px;
`;

interface TraceGanttChartProps {
	treeData: pushDStree,
	clickedSpan: pushDStree,
	selectedSpan: pushDStree,
	resetZoom: () =>{},
	setSpanTagsInfo: () =>{}
}


const TraceGanttChart = ({ treeData, clickedSpan, selectedSpan, resetZoom , setSpanTagsInfo }: TraceGanttChartProps) => {
	let checkStrictly = false;
	const [selectedRows, setSelectedRows] = useState([]);
	const [selectedRowsData, setSelectedRowsData] = useState([]);
	const [defaultExpandedRows, setDefaultExpandedRows] = useState([]);
	const [sortedTreeData, setSortedTreeData] = useState(treeData);
	const [isReset, setIsReset] = useState(false);
	const [rowId, setRowId] = useState(0);
	const tableRef = useRef("");

	const { id } = treeData || "id";
	let maxGlobal = 0;
	let minGlobal = 0;
	let medianGlobal = 0;
	let endTimeArray: [] = [];
	
	useEffect(() => {
		if (id !== "empty") {
			setSortedTreeData(treeData);
		}
		handleScroll(selectedSpan?.id)
	}, [sortedTreeData, treeData, clickedSpan]);
	
	useEffect(()=>{
		if (clickedSpan && !selectedRows.includes(clickedSpan.id) && !isReset) {
			setSelectedRows([clickedSpan.id]);
			getParentKeys(clickedSpan);
			let keys = [clickedSpan?.id, ...parentKeys];
			// setDefaultExpandedRows(keys)
			handleFocusOnSelectedPath('', [clickedSpan.id], clickedSpan);
		}
	}, [clickedSpan, selectedRows, isReset])
	
	let parentKeys: [] = [];
	const getParentKeys = (obj) => {
		if (has(obj, "parent")) {
			parentKeys.push(obj.parent.id);
			getParentKeys(obj.parent);
		}
	};
	
	useEffect(() => {
		if (!isEmpty(selectedSpan) && isEmpty(clickedSpan)) {
			getParentKeys(selectedSpan);
			let keys = [selectedSpan?.id, ...parentKeys];
			setDefaultExpandedRows(keys);
			setSelectedRows([selectedSpan.id, clickedSpan]);
		}
		else{
			setSelectedRows([]);
		}
	}, [selectedSpan]);
	
	
	const getMaxEndTime = (treeData) => {
		if (treeData.length > 0) {
			if (treeData?.id !== "empty") {
				return Array.from(treeData).map((item, key) => {
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
			render: (_, record: pushDStree) => {
				let tabs = document.querySelectorAll("#collapsable .ant-tabs-tab");
				let tabsContainerWidth = document.querySelector("#collapsable .ant-tabs-nav-list")?.offsetWidth;
				let widths: [] = [];
				let length;
				
				if (widths.length < tabs.length) {
					Array.from(tabs).map((tab) => {
						widths.push(tab.offsetWidth);
					});
				}
				
				let paddingLeft: number = 0;
				let startTime = record.startTime;
				let duration = (record.time / 1000000).toFixed(2);
				
				if (startTime < medianGlobal) {
					paddingLeft = parseInt(getPaddingLeft(startTime - minGlobal, tabsContainerWidth));
				} else if (startTime >= medianGlobal && startTime < maxGlobal) {
					paddingLeft = parseInt(getPaddingLeft(widths[0] + (startTime - medianGlobal), tabsContainerWidth, tabs[1].offsetLeft));
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
	
	let isFound = false;
	const handleFocusOnSelectedPath = (event, selectedRowsList = selectedRows) => {
		if(!isEmpty(selectedRowsList)) {
			let rows = document.querySelectorAll("#collapsable table tbody tr");
			Array.from(rows).map((row) => {
				let attribKey = row.getAttribute("data-row-key");
				if (!selectedRowsList.includes(attribKey)) {
					row.classList.add("hide");
					isFound = false
				}
				else{
					isFound = true;
				}
			});
			// if(!isFound){
			// 	handleResetFocus(true);
			// 	getParentKeys(selectedRowsData[0]);
			// 	let keys = [selectedRowsData[0]?.id, ...parentKeys];
			// 	setDefaultExpandedRows(keys);
			// 	handleFocusOnSelectedPath(keys);
			// }
		}
	};
	
	const handleResetFocus = (implicitReset = false) => {
		let rows = document.querySelectorAll("#collapsable table tbody tr");
		Array.from(rows).map((row) => {
			row.classList.remove("hide");
		});
		
		// if(!implicitReset) {
			resetZoom(true);
		// }
	};
	
	const handleScroll = (id) =>{
		let rows = document.querySelectorAll("#collapsable table tbody tr");
		const table = document.querySelectorAll("#collapsable table")
		Array.from(rows).map((row) => {
			let attribKey = row.getAttribute("data-row-key");
			if (id === attribKey) {
				let scrollValue = table[1].offsetTop - row.offsetHeight
					table[1].scrollTop = scrollValue;
			}
		});
	}
	
	
	console.log("getTreeData", getTreeData())
	
	const rowSelection = {
		onChange: (selectedRowKeys, selectedRows, record) => {
			if(isEmpty(selectedRowKeys)){
				setIsReset(true)
			}
			else{
				setIsReset(false)
			}
			setSelectedRows(selectedRowKeys);
		},
		selectedRowKeys: selectedRows,
	};
	
	const handleRowOnClick = (record) => {
		setRowId(record.id);
		
		// const selectedRowKeys = selectedRows;
		// if (selectedRowKeys.indexOf(record.id) >= 0) {
		// 	selectedRowKeys.splice(selectedRowKeys.indexOf(record.key), 1);
		// } else {
		// 	selectedRowKeys.push(record.id);
		// }
		setSelectedRows([record.id]);
		// console.log("selectedRowKeys", selectedRowKeys)
		handleFocusOnSelectedPath('', [record.id], record);
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
						// onRow={(record, rowIndex) => {
						// 	return {
						// 		onClick: () => handleRowOnClick(record, rowIndex), // click row
						// 	};
						// }}
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