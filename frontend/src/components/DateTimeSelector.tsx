import React, { useEffect, useState } from "react";
import { Select, Button, Space, Form } from "antd";
import styled from "styled-components";
import { withRouter } from "react-router";
import { RouteComponentProps } from "react-router-dom";
import { connect } from "react-redux";

import CustomDateTimeModal from "./CustomDateTimeModal";
import { GlobalTime, updateTimeInterval } from "../actions";
import { StoreState } from "../reducers";
import FormItem from "antd/lib/form/FormItem";

import { DateTimeRangeType } from "../actions";
import { METRICS_PAGE_QUERY_PARAM } from "../constants/query";
import { LOCAL_STORAGE } from "../constants/localStorage";
const { Option } = Select;

const DateTimeWrapper = styled.div`
	margin-top: 20px;
`;

interface DateTimeSelectorProps extends RouteComponentProps<any> {
	currentpath?: string;
	updateTimeInterval: Function;
	globalTime: GlobalTime;
}

const _DateTimeSelector = (props: DateTimeSelectorProps) => {
	const defaultTime = "15min";
	const [customDTPickerVisible, setCustomDTPickerVisible] = useState(false);
	const [timeInterval, setTimeInterval] = useState(defaultTime);
	const [refreshButtonHidden, setRefreshButtonHidden] = useState(false);
	const [form_dtselector] = Form.useForm();

	useEffect(() => {
		const timeDurationInLocalStorage = localStorage.getItem(
			LOCAL_STORAGE.METRICS_TIME_IN_DURATION,
		);
		const urlParams = new URLSearchParams(window.location.search);
		const timeInQueryParam = urlParams.get(METRICS_PAGE_QUERY_PARAM.time);
		if (timeInQueryParam) {
			setMetricsTime(timeInQueryParam);
		} else if (timeDurationInLocalStorage) {
			setMetricsTime(timeDurationInLocalStorage);
		}
	}, []);

	const setMetricsTime = (value: string) => {
		props.history.push({
			search: `?${METRICS_PAGE_QUERY_PARAM.time}=${value}`,
		}); //pass time in URL query param for all choices except custom in datetime picker
		props.updateTimeInterval(value);
		setTimeInterval(value);
	};

	const handleOnSelect = (value: string) => {
		if (value === "custom") {
			setCustomDTPickerVisible(true);
		} else {
			setTimeInterval(value);
			setRefreshButtonHidden(false); // for normal intervals, show refresh button
		}
	};

	//function called on clicking apply in customDateTimeModal
	const handleOk = (dateTimeRange: DateTimeRangeType) => {
		// pass values in ms [minTime, maxTime]
		if (
			dateTimeRange !== null &&
			dateTimeRange !== undefined &&
			dateTimeRange[0] !== null &&
			dateTimeRange[1] !== null
		) {
			props.updateTimeInterval("custom", [
				dateTimeRange[0].valueOf(),
				dateTimeRange[1].valueOf(),
			]);
			//setting globaltime
			setRefreshButtonHidden(true);
			form_dtselector.setFieldsValue({
				interval:
					dateTimeRange[0].format("YYYY/MM/DD HH:mm") +
					"-" +
					dateTimeRange[1].format("YYYY/MM/DD HH:mm"),
			});
		}
		setCustomDTPickerVisible(false);
	};

	const timeSinceLastRefresh = () => {
		let timeDiffSec = Math.round(
			(Date.now() - Math.round(props.globalTime.maxTime / 1000000)) / 1000,
		);

		//How will Refresh button get updated? Needs to be periodically updated via timer.
		// For now, not returning any text here
		// if (timeDiffSec < 60)
		//     return timeDiffSec.toString()+' s';
		// else if (timeDiffSec < 3600)
		//     return Math.round(timeDiffSec/60).toString()+' min';
		// else
		//     return Math.round(timeDiffSec/3600).toString()+' hr';
		return null;
	};

	const handleRefresh = () => {
		window.localStorage.setItem(
			LOCAL_STORAGE.METRICS_TIME_IN_DURATION,
			timeInterval,
		);
		setMetricsTime(timeInterval);
	};

	const options = [
		{ value: "custom", label: "Custom" },
		{ value: "15min", label: "Last 15 min" },
		{ value: "30min", label: "Last 30 min" },
		{ value: "1hr", label: "Last 1 hour" },
		{ value: "6hr", label: "Last 6 hour" },
		{ value: "1day", label: "Last 1 day" },
		{ value: "1week", label: "Last 1 week" },
	];
	if (props.location.pathname.startsWith("/usage-explorer")) {
		return null;
	} else {
		return (
			<DateTimeWrapper>
				<Space>
					<Form
						form={form_dtselector}
						layout="inline"
						initialValues={{ interval: "15min" }}
						style={{ marginTop: 10, marginBottom: 10 }}
					>
						<FormItem></FormItem>
						<Select onSelect={handleOnSelect} value={timeInterval}>
							{options.map(({ value, label }) => (
								<Option value={value}>{label}</Option>
							))}
						</Select>

						<FormItem hidden={refreshButtonHidden} name="refresh_button">
							<Button type="primary" onClick={handleRefresh}>
								Refresh {timeSinceLastRefresh()}
							</Button>
							{/* if refresh time is more than x min, give a message? */}
						</FormItem>
					</Form>
					<CustomDateTimeModal
						visible={customDTPickerVisible}
						onCreate={handleOk}
						onCancel={() => {
							setCustomDTPickerVisible(false);
						}}
					/>
				</Space>
			</DateTimeWrapper>
		);
	}
};
const mapStateToProps = (state: StoreState): { globalTime: GlobalTime } => {
	return { globalTime: state.globalTime };
};

export const DateTimeSelector = connect(mapStateToProps, {
	updateTimeInterval: updateTimeInterval,
})(_DateTimeSelector);

export default withRouter(DateTimeSelector);
