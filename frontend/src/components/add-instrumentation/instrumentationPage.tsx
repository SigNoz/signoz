import React, { useEffect, useState } from "react";
import { Form, Input, Space } from "antd";
import { connect } from "react-redux";
import { Tooltip } from "antd";
import {
	InfoCircleOutlined,
	EyeTwoTone,
	EyeInvisibleOutlined,
} from "@ant-design/icons";
import { StoreState } from "../../reducers";

import { Alert } from "antd";

interface InstrumentationPageProps {}


const InstrumentationPage = (props: InstrumentationPageProps) => {


	return (
		<React.Fragment>


			<Space style={{ marginLeft: 60, marginTop: 48, display: 'block' }}>
				<div>
					<h2>
						Instrument your application
					</h2>
				</div>

				<div className={"instrument-card"}>
					Congrats, you have successfully installed SigNoz!<br/>
					To start seeing YOUR application data here, follow the instructions in the docs -
					<a href={"https://signoz.io/docs/instrumentation/overview"}> https://signoz.io/docs/instrumentation/overview</a>
					<br/>
					If you face any issues, join our <a href={"https://signoz-community.slack.com/join/shared_invite/zt-lrjknbbp-J_mI13rlw8pGF4EWBnorJA"}>
					slack community</a> to ask any questions or mail us at <a href={"mailto:support@signoz.io"}>
					support@signoz.io
				</a>
				</div>
			</Space>
		</React.Fragment>
	);
};

const mapStateToProps = (state: StoreState): {} => {
	return {};
};

export default connect(mapStateToProps, {})(InstrumentationPage);
