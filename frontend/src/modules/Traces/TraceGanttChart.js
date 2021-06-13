import React, { useRef, useState } from "react";
import { Table, Progress, Tabs, Button } from "antd";
import "./Collapse.css";
import { max, min, flatMapDeep, map } from "lodash";

const { TabPane } = Tabs;

const TraceGanttChart = ({ treeData }) => {
	console.log("treeData", treeData);
	
	const { id } = treeData;
	let maxGlobal = 0;
	let minGlobal = 0;
	let medianGlobal = 0;
	
	if (id !== "empty") {
		const minArray = flatMapDeep(treeData, ({ children }) =>
			map(children, (item) => item.startTime),
		);
		
		const maxArray = flatMapDeep(treeData, ({ children }) =>
			map(children, (item) => item.startTime + item.time),
		);
		
		maxGlobal = max(maxArray);
		minGlobal = min(minArray);
		medianGlobal = (minGlobal + maxGlobal) / 2;
	}
	
	const getPaddingLeft = (value, totalWidth) =>{
		return (value/totalWidth * 100).toFixed(0)
	}
	
	const columns = [
		{
			title: "Name",
			dataIndex: "name",
			key: "name",
		},
		{
			title:
				<Tabs>
					<TabPane tab={minGlobal + "ms"} key="1" />
					<TabPane tab={medianGlobal + "ms"} key="2" />
					<TabPane tab={maxGlobal + "ms"} key="2" />
				</Tabs>,
			dataIndex: "trace",
			name: "trace",
			render: (_, record) => {
				let tabs = document.querySelectorAll(".collapsable .ant-tabs-tab");
				let tabsContainerWidth = document.querySelector(".collapsable .ant-tabs-nav-list")?.offsetWidth;
				let widths = [];
				let length = 0;
				
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
					paddingLeft = getPaddingLeft(widths[0]  + (startTime - medianGlobal), tabsContainerWidth);
				}
				
				length = ((record.time) / (maxGlobal - minGlobal) * 100).toFixed(2);
				
				return (
					<>
						<Progress percent={length} showInfo={false} style={{ paddingLeft: paddingLeft + "px" }} />
						<div style={{ paddingLeft: paddingLeft + "px" }}>{startTime}ms</div>
					</>
				);
			},
		},
	];
	
	let checkStrictly = false;
	const [selectedRows, setSelectedRows] = useState([]);
	const tableRef = useRef("");
	
	const handleFocusOnSelectedPath = () => {
		let rows = document.querySelectorAll(".collapsable table tbody tr");
		Array.from(rows).map((row) => {
			let attribKey = parseInt(row.getAttribute("data-row-key"));
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
		onChange: (selectedRowKeys, selectedRows) => {
			console.log("selectedRowKeys", selectedRowKeys)
			setSelectedRows(selectedRowKeys);
		},
		onSelect: (record, selected, selectedRows) => {
			console.log(record, selected, selectedRows);
		},
		onSelectAll: (selected, selectedRows, changeRows) => {
			console.log(selected, selectedRows, changeRows);
		},
	};
	
	return (
		<>
			{id !== "empty" && (
				<>
					<Table
						ref={tableRef}
						checkStrictly={true}
						hideSelectAll={true}
						columns={columns}
						rowSelection={{ ...rowSelection, checkStrictly }}
						dataSource={treeData}
						rowKey="id"
						sticky = {true}
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