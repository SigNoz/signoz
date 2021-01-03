import React from 'react';
import { Bar, Line as ChartJSLine } from 'react-chartjs-2'; 
import styled from 'styled-components';

import { customMetricsItem } from '../../actions/metrics'

const GenVisualizationWrapper = styled.div`
height:160px;
`;

interface GenericVisualizationsProps {
    chartType: string;
    data: customMetricsItem[];
}

const GenericVisualizations = (props: GenericVisualizationsProps) => {
    // const [serviceName, setServiceName] = useState('Frontend'); //default value of service name

    const data =  {
        labels: props.data.map(s => new Date(s.timestamp/1000000)),
        datasets: [{ 
            data: props.data.map(s => s.value),
            // label: "Africa",
            borderColor: 'rgba(250,174,50,1)',// for line chart
            backgroundColor: props.chartType==='bar'?'rgba(250,174,50,1)':'', // for bar chart, don't assign backgroundcolor if its not a bar chart, may be relevant for area graph though
          },
          //  { 
          //   data: [282,350,411,502,635,809,947,1402,3700,5267,282,350,411,502,635,809,947,1402,3700,5267],
          //   label: "Asia",
          //   borderColor: 'rgba(227, 74, 51, 1.0)',
          //   backgroundColor: props.chartType==='bar'?'rgba(227, 74, 51, 1.0)':'',
          // }, 
        //{ 
        //     data: [168,170,178,190,203,276,408,547,675,734],
        //     label: "Europe",
        //     borderColor: "#3cba9f",
        //     fill: false
        //   }, { 
        //     data: [40,20,10,16,24,38,74,167,508,784],
        //     label: "Latin America",
        //     borderColor: "#e8c3b9",
        //     fill: false
        //   }, { 
        //     data: [6,3,2,2,7,26,82,172,312,433],
        //     label: "North America",
        //     borderColor: "#c45850",
        //     fill: false
        //   }
        ]
      };

      const options= {
        responsive: true,
        maintainAspectRatio: false,
        legend: {
            display: false,
        },
        scales: {
            yAxes: [{
              gridLines: {
                drawBorder: false,
              },
              ticks: {
                display: false
                }
            }],
            xAxes: [{
              type: 'time',
              // time: {
              //     unit: 'second'
              // },
              //PNOTE - How to enable distribution == linear?
              // distribution: 'linear',
              //'linear': data are spread according to their time (distances can vary)
              // From https://www.chartjs.org/docs/latest/axes/cartesian/time.html 
              ticks: {
                  beginAtZero: false,
                  fontSize: 10,
                  autoSkip: true,
                  maxTicksLimit: 10,
              },
              // gridLines: false, --> not a valid option
          }],
          },
      };

        if(props.chartType === 'line')
        {
            return (
                <GenVisualizationWrapper>
                    <ChartJSLine data={data} options={options} />
                </GenVisualizationWrapper>
            );
        
        } else if (props.chartType === 'bar')
        {
            return (
                <GenVisualizationWrapper>
                    <Bar data={data} options={options} />
                </GenVisualizationWrapper>
            );
        }
        else
            return null;
        
}

export default GenericVisualizations;