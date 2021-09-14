import Graph from 'components/Graph';
import { filter, uniqBy } from 'lodash';
import React from 'react';
import { withRouter } from 'react-router';
import { RouteComponentProps } from 'react-router-dom';
import { externalMetricsItem } from 'store/actions/MetricsActions';

import { borderColors } from './graphConfig';

interface ExternalApiGraphProps extends RouteComponentProps<any> {
	data: externalMetricsItem[];
	keyIdentifier?: string;
	label?: string;
	title: string;
	dataIdentifier: string;
	fnDataIdentifier?: (s: number | string) => number | string;
}

interface ExternalApiGraph {
	chartRef: any;
}

class ExternalApiGraph extends React.Component<ExternalApiGraphProps> {
	constructor(props: ExternalApiGraphProps) {
		super(props);
		this.chartRef = React.createRef();
	}

	state = {
		xcoordinate: 0,
		ycoordinate: 0,
		showpopUp: false,
		firstpoint_ts: 0,
		// graphInfo:{}
	};

	render() {
		const {
			title,
			label,
			data,
			dataIdentifier,
			keyIdentifier,
			fnDataIdentifier,
		} = this.props;
		const getDataSets = () => {
			if (!keyIdentifier) {
				return [
					{
						label: label || '',
						data: data.map((s: externalMetricsItem) =>
							fnDataIdentifier
								? fnDataIdentifier(s[dataIdentifier])
								: s[dataIdentifier],
						),
						pointRadius: 0.5,
						borderColor: borderColors[0],
						borderWidth: 2,
					},
				];
			}
			const uniq = uniqBy(data, keyIdentifier);
			return uniq.map((obj: externalMetricsItem, i: number) => {
				const _data = filter(
					data,
					(s: externalMetricsItem) => s[keyIdentifier] === obj[keyIdentifier],
				);
				return {
					label: obj[keyIdentifier],
					data: _data.map((s: externalMetricsItem) =>
						fnDataIdentifier
							? fnDataIdentifier(s[dataIdentifier])
							: s[dataIdentifier],
					),
					pointRadius: 0.5,
					borderColor: borderColors[i] || borderColors[0], // Can also add transparency in border color
					borderWidth: 2,
				};
			});
		};

		const data_chartJS = () => {
			const uniqTimestamp = uniqBy(data, 'timestamp');

			return {
				labels: uniqTimestamp.map(
					(s: externalMetricsItem) => new Date(s.timestamp / 1000000),
				),
				datasets: getDataSets(),
			};
		};

		return (
			<>
				<div style={{ textAlign: 'center' }}>{title}</div>
				<div>
					<Graph data={data_chartJS()} xAxisType="timeseries" type="line" />
				</div>
			</>
		);
	}
}

export default withRouter(ExternalApiGraph);
