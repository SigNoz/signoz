import React, { useEffect, useState } from 'react'
import { useParams } from "react-router-dom";
import { flamegraph } from 'd3-flame-graph'
import { connect } from 'react-redux';
import { Card, Button, Row, Col, Space } from 'antd';
import * as d3 from 'd3';
import * as d3Tip from 'd3-tip';

//import * as d3Tip from 'd3-tip';
// PNOTE - uninstall @types/d3-tip. issues with importing d3-tip https://github.com/Caged/d3-tip/issues/181
// import styled from 'styled-components';

import './TraceGraph.css'
import { spanToTreeUtil } from '../../utils/spanToTree'
import {  fetchTraceItem , spansWSameTraceIDResponse } from '../../actions';
import { StoreState } from '../../reducers'
import { TraceGraphColumn } from './TraceGraphColumn'
import SelectedSpanDetails from './SelectedSpanDetails'


interface TraceGraphProps {

  traceItem: spansWSameTraceIDResponse ,
  fetchTraceItem: Function,
}


const _TraceGraph = (props: TraceGraphProps) => {

  const params = useParams<{ id?: string; }>();
  const [clickedSpanTags,setClickedSpanTags]=useState([])

  useEffect( () => {
    console.log('inside initial fetch trace for flamegraph')
    props.fetchTraceItem(params.id);
  }, []);

  useEffect( () => {
    if (props.traceItem[0].events.length>0)
    {
      const tree = spanToTreeUtil(props.traceItem[0].events);
      d3.select("#chart").datum(tree).call(chart);
    } 
  },[props.traceItem]); 
  // if this monitoring of props.traceItem.data is removed then zoom on click doesn't work
  // Doesn't work if only do initial check, works if monitor an element - as it may get updated in sometime

   // PNOTE - Is this being called multiple times?
  //PNOTE - Do we fetch trace data again based on id or  do we call again using rest calls
  // d3-flame-graph repository -- https://github.com/spiermar/d3-flame-graph 

  //  const tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d; });
  // const tip = d3Tip.default().attr('class', 'd3-flame-graph-tip').html(function(d:any) { console.log(d);return 'Name -> '+d.data.name+'<BR>Duration -> '+d.data.value});
  //https://stackoverflow.com/questions/5934928/javascript-return-value-for-tooltip -> How to display tooltip
  //const tip = d3Tip.default().attr('class', 'd3-tip').html(function(d:any) { console.log(d);return <FlamegraphTooltip>{d.data.name}</FlamegraphTooltip>});

  // var tip = flamegraph.tooltip.defaultFlamegraphTooltip().html(function(d) { return "name: " + d.data.name + ", value: " + d.data.value; });
  const tip = d3Tip.default().attr('class', 'd3-tip').html(function(d:any) { return d.data.name+'<br>duration: '+d.data.value});
  // PNOTE - Used this example for tooltip styling

  const onClick =  (z:any) => {
    // props.tagsInfo(d.data.tags)
    // let new_tags = z.data.tags;
    // let new_tags = [{
    //   key: 'Ankit',
    //   type: 'testin',
    //   value: 'Nothing',
    // }]
    //  setClickedSpanTags(new_tags);
    // setNum(9);
    setClickedSpanTags(z.data.tags);
    console.log(`Clicked on ${z.data.name}, id: "${z.id}"`);
  }

  
  const chart = flamegraph()
    .width(640)
    .cellHeight(18)
    .transitionDuration(500)
    .minFrameSize(5)
    .sort(true)
    .inverted(true)
    .tooltip(tip)
    .elided(false)
    .onClick(onClick)
    //   .title("Trace Flame graph")
    .differential(false)
    .selfValue(true); //sets span width based on value - which is mapped to duration
  //PNOTE
  // used inverted() instead of passing a function in Sort
  //   .sort(function(a :pushDStree,b :pushDStree) :number{
  //     if(a.startTime < b.startTime) return -1;
  //     else return 1;
  //   })
  //removed transition ease - easeCubic as it was giving type error. d3.easeCubic is the default transition easing function
  //Example to sort in reverse order
  //.sort(function(a,b){ return d3.descending(a.name, b.name);})



 

  // PNOTE - filter based on traceid - trace should already be in redux-state, will redux-state become very big if all trace reponses are stored in it

  //if tree
  // d3.select("#chart").datum(tree).call(chart)

  const resetZoom = () => {
    chart.resetZoom();
  }

  return (

    <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
      <Col md={8} sm={24} >
        <TraceGraphColumn />
      </Col>
      <Col md={16} sm={24} >
        {/* <Card style={{ width: 640 }}> */}
        <Space direction="vertical" size='middle' >

          <Card bodyStyle={{padding: 80, }} style={{ height: 320, }}>
            <div>Trace Graph component ID is {params.id} </div>
            <Button type="primary" onClick={resetZoom}>Reset Zoom</Button>
            <div id="chart" style={{ fontSize: 12 }}></div>
          </Card>

          <SelectedSpanDetails clickedSpanTags={clickedSpanTags}/>

        </Space>
      </Col>
     
    </Row>
  );

}

const mapStateToProps = (state: StoreState): { traceItem: spansWSameTraceIDResponse  } => {
  // console.log(state);
  return { traceItem: state.traceItem };
};
// the name mapStateToProps is only a convention
// take state and map it to props which are accessible inside this component

export const TraceGraph = connect(mapStateToProps, {
  fetchTraceItem: fetchTraceItem,
})(_TraceGraph);