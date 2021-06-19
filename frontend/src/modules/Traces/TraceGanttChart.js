import React, { useEffect, useRef, useState } from "react";
import { Table, Progress, Tabs, Button } from "antd";
import "./Collapse.css";
import { max, min, sortBy } from "lodash-es";

const { TabPane } = Tabs;

const TraceGanttChart = ({ treeData }) => {
	let checkStrictly = false;
	const [selectedRows, setSelectedRows] = useState([]);
	const [sortedTreeData, setSortedTreeData] = useState([]);
	const tableRef = useRef("");
	
	const { id } = treeData;
	let maxGlobal = 0;
	let minGlobal = 0;
	let medianGlobal = 0;
	
	let sortedData = {};
	let endTimeArray = [];
	let startTimeArray = [];
	
	const getMaxEndTime = (treeData) => {
		if (treeData.length > 0) {
			if (treeData[0].id !== "empty") {
				return Array.from(treeData).map((item, key) => {
					if (item.children.length > 0) {
						endTimeArray.push((item.time / 1000000) + item.startTime);
						getMaxEndTime(item.children);
					} else {
						endTimeArray.push((item.time / 1000000) + item.startTime);
					}
				});
			}
		}
	};
	
	const getSortedData = (treeData) =>{
		if (treeData.length > 0) {
			if (treeData[0].id !== "empty") {
				return Array.from(treeData).map((item, key) => {
					if (item.children.length > 0) {
						getSortedData(item.children);
						sortedData = sortBy(item.children, (i)=> i.startTime)
						treeData[key].children = sortedData;
						console.log("treeData", treeData)
						return treeData
					}
				});
			}
		}
	}
	
	const getMinStartTime = (treeData) => {
		if (treeData.length > 0) {
			if (treeData[0].id !== "empty") {
				Array.from(treeData).map((item) => {
					if (item.children.length > 0) {
						startTimeArray.push(item.startTime);
						getMinStartTime(item.children);
					} else {
						startTimeArray.push(item.startTime);
					}
				});
			}
		}
	};
	
	useEffect(()=>{
		if (id !== "empty") {
			let sortedTreeData = getSortedData(treeData);
			console.log("sortedTreeData, useEffect", sortedTreeData)
			setSortedTreeData(sortedTreeData?.[0])
		 }
	}, [sortedTreeData, treeData])
	
	if (id !== "empty") {
		getMaxEndTime(treeData);
		getMinStartTime(treeData);
		maxGlobal = max(endTimeArray);
		minGlobal = min(startTimeArray);
		medianGlobal = (minGlobal + maxGlobal) / 2;
	}
	
	const getPaddingLeft = (value, totalWidth, leftOffset = 0) => {
		return (((value / totalWidth) * 100) + leftOffset).toFixed(0);
	};
	
	let tabMinVal = minGlobal?.toFixed(0);
	let tabMedianVal = medianGlobal?.toFixed(0);
	let tabMaxVal = maxGlobal?.toFixed(0);
	
	const columns = [
		{
			title: "Name",
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
				let tabs = document.querySelectorAll(".collapsable .ant-tabs-tab");
				let tabsContainerWidth = document.querySelector(".collapsable .ant-tabs-nav-list")?.offsetWidth;
				let widths = [];
				let length;
				
				if (widths.length < tabs.length) {
					Array.from(tabs).map((tab) => {
						widths.push(tab.offsetWidth);
					});
				}
				
				let paddingLeft = 0;
				let startTime = record.startTime;
				
				if (startTime < medianGlobal) {
					paddingLeft = getPaddingLeft(startTime - minGlobal, tabsContainerWidth);
				} else if (startTime >= medianGlobal && startTime < maxGlobal) {
					paddingLeft = getPaddingLeft(widths[0] + (startTime - medianGlobal), tabsContainerWidth, tabs[1].offsetLeft);
				}
				
				length = (((record.time / 1000000) / (maxGlobal - minGlobal)) * 100).toFixed(2);
				
				return (
					<>
						<Progress percent={length} showInfo={false} style={{ paddingLeft: paddingLeft + "px" }} />
						<div style={{ paddingLeft: paddingLeft + "px" }}>{startTime}ms</div>
					</>
				);
			},
		},
	];
	
	
	const handleFocusOnSelectedPath = () => {
		let rows = document.querySelectorAll(".collapsable table tbody tr");
		Array.from(rows).map((row) => {
			let attribKey = row.getAttribute("data-row-key");
			if (!selectedRows.includes(attribKey)) {
				row.classList.add("hide");
			}
		});
	};
	
	const handleResetFocus = () => {
		let rows = document.querySelectorAll(".collapsable table tbody tr");
		Array.from(rows).map((row) => {
			row.classList.remove("hide");
		});
	};
	
	const rowSelection = {
		onChange: (selectedRowKeys) => {
			console.log(selectedRowKeys)
			setSelectedRows(selectedRowKeys);
		},
	};
	
	return (
		<>
			{id !== "empty" && (
				<>
					<Table
						refs={tableRef}
						checkStrictly={true}
						hideSelectAll={true}
						columns={columns}
						rowSelection={{ ...rowSelection, checkStrictly }}
						dataSource={sortedTreeData}
						rowKey="id"
						sticky={true}
						pagination={false} />
					<Button onClick={handleFocusOnSelectedPath}> Focus on selected path </Button>
					<Button onClick={handleResetFocus}> Reset Focus </Button>
				</>
			)
			}
		</>
	);
};

export default TraceGanttChart;