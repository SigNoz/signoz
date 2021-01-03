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


// PNOTE - Check if this should be the case
const theme = 'dark';
  


interface ErrorRateChartProps extends RouteComponentProps<any> {
  data : metricItem[],
}

interface ErrorRateChart {
  chartRef: any;
}


class ErrorRateChart extends React.Component<ErrorRateChartProps>{

  constructor(props: ErrorRateChartProps) {
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


    onClick: this.onClickhandler,

    maintainAspectRatio: true,
    responsive: true,

    title: {
        display: true,
        text: 'Error per sec',
        fontSize: 20,
        position:'top',
        padding: 2,
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
        distribution:'linear',
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
            return{labels: ndata.map(s => new Date(s.timestamp/1000000)), // converting from nano second to mili second
              datasets: [{
                label: 'Errors per sec',
                data: ndata.map(s => s.errorRate),
              //   backgroundColor:'#000000',
                // fill: true,
                // backgroundColor: gradient,
                pointRadius: 0.5,
                borderColor: 'rgba(227, 74, 51,1)', // Can also add transparency in border color
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

export default withRouter(ErrorRateChart);