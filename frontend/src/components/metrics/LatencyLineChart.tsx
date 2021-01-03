import React from 'react';
import { Line as ChartJSLine } from 'react-chartjs-2'; 
import { ChartOptions } from 'chart.js';
import { withRouter } from "react-router";
import { RouteComponentProps } from 'react-router-dom';
import styled from 'styled-components';

import { metricItem } from '../../actions/metrics'

const ChartPopUpUnique = styled.div<{ ycoordinate: number, xcoordinate: number }>`
background-color:white;
border:1px solid rgba(219,112,147,0.5);
zIndex:10;
position:absolute;
top:${props => props.ycoordinate}px;
left:${props => props.xcoordinate}px;
font-size:10px;
border-radius:2px;
`;

const PopUpElements = styled.p`
color:black;
margin-bottom:0px;
padding-left:4px;
padding-right:4px;
&:hover {
  cursor:pointer;
}
`;


// const data_charts = {
//     labels: ['1', '2', '3', '4', '5', '6'],
//     datasets: [
//       {
//         // label: '# of Votes',
//         data: [12, 19, 3, 5, 2, 3],
//         fill: false,
//         backgroundColor: 'rgb(255, 99, 132)',
//         borderColor: 'rgba(255, 99, 132, 0.2)',
//       },
//     ],
//   }

//   const onClickHandler = (e) => {
//     console.log("ChartJS chart clicked");
//     console.log(e);
//   };

  // export interface ApiData {
  //   0: number, // has epoch timestamp
  //   1: string, // has value of the metric as a string
  // }

  const theme = 'dark';
  
// PNOTE - accessing history object in typescript - https://stackoverflow.com/questions/49342390/typescript-how-to-add-type-check-for-history-object-in-react
// withRouter is used to pass on history object as prop - https://stackoverflow.com/questions/43107912/how-to-access-history-object-in-new-react-router-v4


interface LatencyLineChartProps extends RouteComponentProps<any> {
  data : metricItem[],
  // chartRef: any,
  // chartReference :ChartJSLineChart,
  // data passed to ChartJSLineChart component is an array if json objects
}

interface LatencyLineChart {
  chartRef: any;
}


class LatencyLineChart extends React.Component<LatencyLineChartProps>{

  constructor(props: LatencyLineChartProps) {
    super(props);
    console.log('React CreatRef', React.createRef());
    this.chartRef = React.createRef();
  }

  

    state = {
      // data: props.data,
      xcoordinate:0,
      ycoordinate:0,
      showpopUp:false,
      // graphInfo:{}
    }
  

   onClickhandler = async(e:any,event:any) => {
      
      console.log('e graph', e)
      // console.log('event graph',event)
      //PNOTE - e has all key values from mouse event, event has only reference to handler functions
      // PNOTE - https://github.com/emn178/angular2-chartjs/issues/29 - for listening only to element points
      // var firstPoin = this.chart.current.getElementAtEvent(e)

      console.log('chartref',this.chartRef.current.chartInstance);

      var firstPoint;
      if(this.chartRef){
         firstPoint = this.chartRef.current.chartInstance.getElementAtEvent(e)[0];
      }
      
      console.log('firstPoint', firstPoint);
      

      // if (firstPoint) {
      //     var label = myChart.data.labels[firstPoint._index];
      //     var value = myChart.data.datasets[firstPoint._datasetIndex].data[firstPoint._index];
      // }
      if (firstPoint)
      {// PNOTE - TODO - Is await needed in this expression?
      await this.setState({
        xcoordinate:e.offsetX+20,
        ycoordinate:e.offsetY,
        showpopUp:true,
        // graphInfo:{...event}
      })
      }
      // console.log(this.state.graphInfo.payload.timestamp)
      //this.props.applicationTimeStamp(e.payload.x)
      // this.props.history.push('/traces?timestamp=' + e.payload.timestamp + '&service=' + this.props.service.name)
  }

  gotoTracesHandler=()=>{
        console.log('in gotoTraces handler')
        this.props.history.push('/traces')
       // this.props.history.push('/traces?timestamp=' + this.state.graphInfo.payload.timestamp + '&service=' + this.props.service.name)
  }

  gotoAlertsHandler=()=>{
        console.log('in gotoAlerts handler')
        this.props.history.push('/service-map')
        // PNOTE - Keeping service map for now, will replace with alerts when alert page is made
  }

  options_charts: ChartOptions = {

    // onClick: function(evt, element) {
    //     // console.log(evt);
    //   },

    //- PNOTE - TO DO -- element is of type ChartElement, how to define its type
    // https://gitlab.com/signoz-frontend/sample-project/-/blob/darkthemechanges/src/Components/Application/Graphs/SimpleLineChart.js
    // Code for popup
    // onClick: function(evt, element :any[]) {
    //   if (element.length > 0) {
    //     var ind = element[0]._index;
    //     console.log(element)
    //     alert(ind);
    //   }
    // },

    onClick: this.onClickhandler,

    maintainAspectRatio: true,
    responsive: true,

    title: {
        display: true,
        text: 'Application Latency in ms',
        fontSize: 20,
        position:'top',
        padding: 8,
        fontFamily: 'Arial',
        fontStyle: 'regular',
        fontColor:theme === 'dark'? 'rgb(200, 200, 200)':'rgb(20, 20, 20)'  ,


    },

    legend: {
        display: true,
        position: 'bottom',
        align: 'center',
    
        labels: {
            fontColor:theme === 'dark'? 'rgb(200, 200, 200)':'rgb(20, 20, 20)'  ,
            fontSize: 10,
            boxWidth : 10,
            usePointStyle : true,
          

        }
    },

    tooltips: { 
        mode: 'label', 
        bodyFontSize: 10,
        titleFontSize: 10,

        callbacks: {
            label: function(tooltipItem, data) {

                if (typeof(tooltipItem.yLabel) === 'number')
                {
                return data.datasets![tooltipItem.datasetIndex!].label +' : '+ tooltipItem.yLabel.toFixed(3);
                }
                else
                {
                  return '';
                } 
                // return data.datasets![tooltipItem.datasetIndex!].label +' : '+ tooltipItem.yLabel!.Fixed(3);
                // not able to do toFixed(3) in typescript as string|number type is not working with toFixed(3) function for 
                // as toFixed() function only works with numbers
                // using type of check gives issues in 'label' variable name
                //!That's the non-null assertion operator. It is a way to tell the compiler "this expression cannot be null or undefined here, so don't complain about the possibility of it being null or undefined." Sometimes the type checker is unable to make that determination itself.

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

        //   scaleLabel: {
        //     display: true,
        //     labelString: 'latency in ms',
        //     fontSize: 6,
        //     padding: 4,
        //   },
          gridLines: {
            // You can change the color, the dash effect, the main axe color, etc.
            borderDash: [1, 4],
            color: "#D3D3D3",
            lineWidth: 0.25,
        }
        },
      ],
      xAxes: [{
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
    }]
    },
  }

  GraphTracePopUp = () => {
    console.log('state in GraphTracePopPup',this.state);

    if (this.state.showpopUp){
      return(

        // <div className='applicationpopup' style={{top:`${this.state.ycoordinate}px`,zIndex:10,position:'absolute',left:`${this.state.xcoordinate}px`,backgroundColor:'white',border:'1px solid grey'}}>
        // <p style={{color:'black'}} onClick={this.gotoTracesHandler}>View Traces</p>
        // <p style={{color:'black'}}> Set Alerts</p>
        // </div>
            // <ChartPopUpUnique>
            //     <p style={{color:'black'}} onClick={this.gotoTracesHandler}>View Traces</p>
            //     <p style={{color:'black'}}> Set Alerts</p>
            // </ChartPopUpUnique>
         
              <ChartPopUpUnique xcoordinate={this.state.xcoordinate} ycoordinate={this.state.ycoordinate}>
                 <PopUpElements onClick={this.gotoTracesHandler}>View Traces</PopUpElements>
                 <PopUpElements onClick={this.gotoAlertsHandler}>Set Alerts</PopUpElements>
              </ChartPopUpUnique>
          
             
      )
    }
    else
        return null;
  }



    render(){

        const ndata = this.props.data;
        // console.log("in chartJS line render function")
        // console.log(ndata);

        // const data_charts = data.map( s => ({label:s.ts, value:parseFloat(s.val)}) );
        // if(this.chartRef.ctx)
        // {
        //   var gradient = this.chartRef.ctx.createLinearGradient(0, 0, 0, 400);
        //   gradient.addColorStop(0, 'rgba(250,174,50,1)');
        //   gradient.addColorStop(1, 'rgba(250,174,50,0)');
        // }
        
         

        const data_chartJS = (canvas:any) => {
            const ctx = canvas.getContext("2d");
            const gradient = ctx.createLinearGradient(0, 0, 0, 100);
            gradient.addColorStop(0, 'rgba(250,174,50,1)');   
            gradient.addColorStop(1, 'rgba(250,174,50,1)');
            return{ labels: ndata.map(s => new Date(s.timestamp/1000000)),
              datasets: [{
                label: 'p99 Latency',
                data: ndata.map(s => s.p99/1000000), //converting latency from nano sec to ms
              //   backgroundColor:'#000000',
                // fill: true,
                // backgroundColor: gradient,
                pointRadius: 0.5,
                borderColor: 'rgba(250,174,50,1)', // Can also add transparency in border color
                borderWidth: 2,	
              }, 
              {
                  label: 'p90 Latency',
                  data: ndata.map(s => s.p90/1000000), //converting latency from nano sec to ms
                  // backgroundColor:'#dd0000',
                  // fill: true,
                  // backgroundColor: 'rgba(227, 74, 51, 1.0)',
                  pointRadius: 0.5,
                  borderColor: 'rgba(227, 74, 51, 1.0)',
                  borderWidth: 2,	
                },
                {
                  label: 'p50 Latency',
                  data: ndata.map(s => s.p50/1000000), //converting latency from nano sec to ms
                  // backgroundColor:'#dd0000',
                  // fill: true,
                  // backgroundColor: 'rgba(227, 74, 51, 1.0)',
                  pointRadius: 0.5,
                  borderColor: 'rgba(57, 255, 20, 1.0)',
                  borderWidth: 2,	
                },
          ]}
            
          };


        return(
          <div>
          {this.GraphTracePopUp()}
          <ChartJSLine ref={this.chartRef} data={data_chartJS} options={this.options_charts}  />
          </div>
        );

    }

}

export default withRouter(LatencyLineChart);