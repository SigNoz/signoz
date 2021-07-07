import { ChartOptions } from 'chart.js';

export const getOptions = (theme: string): ChartOptions => {
	return {
		maintainAspectRatio: true,
		responsive: true,

		title: {
			display: true,
			text: '',
			fontSize: 20,
			position: 'top',
			padding: 8,
			fontFamily: 'Arial',
			fontStyle: 'regular',
			fontColor: theme === 'dark' ? 'rgb(200, 200, 200)' : 'rgb(20, 20, 20)',
		},

		legend: {
			display: true,
			position: 'bottom',
			align: 'center',

			labels: {
				fontColor: theme === 'dark' ? 'rgb(200, 200, 200)' : 'rgb(20, 20, 20)',
				fontSize: 10,
				boxWidth: 10,
				usePointStyle: true,
			},
		},

		tooltips: {
			mode: 'label',
			bodyFontSize: 12,
			titleFontSize: 12,

			callbacks: {
				label: function (tooltipItem, data) {
					if (typeof tooltipItem.yLabel === 'number') {
						return (
							data.datasets![tooltipItem.datasetIndex!].label +
							' : ' +
							tooltipItem.yLabel.toFixed(2)
						);
					} else {
						return '';
					}
				},
			},
		},

		scales: {
			yAxes: [
				{
					stacked: false,
					ticks: {
						beginAtZero: false,
						fontSize: 10,
						autoSkip: true,
						maxTicksLimit: 6,
					},

					gridLines: {
						// You can change the color, the dash effect, the main axe color, etc.
						borderDash: [1, 4],
						color: '#D3D3D3',
						lineWidth: 0.25,
					},
				},
			],
			xAxes: [
				{
					type: 'time',
					// time: {
					//     unit: 'second'
					// },
					distribution: 'linear',
					//'linear': data are spread according to their time (distances can vary)
					// From https://www.chartjs.org/docs/latest/axes/cartesian/time.html
					ticks: {
						beginAtZero: false,
						fontSize: 10,
						autoSkip: true,
						maxTicksLimit: 10,
					},
					// gridLines: false, --> not a valid option
				},
			],
		},
	};
};

export const borderColors = [
	'#00feff',
	'rgba(227, 74, 51, 1.0)',
	'rgba(250,174,50,1)',
	'#058b00',
	'#a47f00',
	'rgba(57, 255, 20, 1.0)',
	'#45a1ff',
	'#ffe900',
	'#30e60b',
	'#8000d7',
	'#ededf0'
];
