import React, { useEffect } from "react";
import { Bar } from "react-chartjs-2";
import { Card } from "antd";
import { connect } from "react-redux";

import { getUsageData, GlobalTime, usageDataItem } from "../../actions";
import { StoreState } from "../../reducers";

interface UsageExplorerProps {
	usageData: usageDataItem[];
	getUsageData: Function;
	globalTime: GlobalTime;
}

const _UsageExplorer = (props: UsageExplorerProps) => {
	useEffect(() => {
		props.getUsageData(props.globalTime);
	}, [props.globalTime]);

	const data = {
		labels: props.usageData.map((s) => new Date(s.timestamp / 1000000)),
		datasets: [
			{
				label: "Span Count",
				data: props.usageData.map((s) => s.count),
				backgroundColor: "rgba(255, 99, 132, 0.2)",
				borderColor: "rgba(255, 99, 132, 1)",
				borderWidth: 2,
			},
		],
	};

	const options = {
		scales: {
			yAxes: [
				{
					ticks: {
						beginAtZero: true,
						fontSize: 10,
					},
				},
			],
			xAxes: [
				{
					type: "time",
					// distribution: 'linear', // Bar graph doesn't take lineardistribution type?

					ticks: {
						beginAtZero: true,
						fontSize: 10,
					},
				},
			],
		},
		legend: {
			display: false,
		},
	};

	return (
		<React.Fragment>
			{/* PNOTE - TODO - Keep it in reponsive row column tab */}
			<Card style={{ width: "50%", margin: 20 }} bodyStyle={{ padding: 20 }}>
				<Bar data={data} options={options} />
			</Card>
		</React.Fragment>
	);
};

const mapStateToProps = (
	state: StoreState,
): { usageData: usageDataItem[]; globalTime: GlobalTime } => {
	return { usageData: state.usageDate, globalTime: state.globalTime };
};

export const UsageExplorer = connect(mapStateToProps, {
	getUsageData: getUsageData,
})(_UsageExplorer);
