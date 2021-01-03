import React,{useEffect} from 'react';
import { Tabs, Card, Row, Col} from 'antd';
import { connect } from 'react-redux';
import { useParams } from "react-router-dom";


import { getServicesMetrics, metricItem, getTopEndpoints, topEndpointListItem, GlobalTime } from '../../actions';
import { StoreState } from '../../reducers'
import LatencyLineChart from "./LatencyLineChart"
import RequestRateChart from './RequestRateChart'
import ErrorRateChart from './ErrorRateChart'
import TopEndpointsTable from './TopEndpointsTable';

const { TabPane } = Tabs;

interface ServicesMetricsProps {
  serviceMetrics: metricItem[],
  getServicesMetrics: Function,
  topEndpointsList: topEndpointListItem[],
  getTopEndpoints: Function,
  globalTime: GlobalTime,
}


const _ServiceMetrics = (props: ServicesMetricsProps) => {

  const params = useParams<{ servicename?: string; }>();
  console.log('service name',params.servicename);

  useEffect( () => {
    props.getServicesMetrics(params.servicename,props.globalTime);
    props.getTopEndpoints(params.servicename,props.globalTime);
  }, [props.globalTime,params.servicename]);
  
    return (
      <Tabs defaultActiveKey="1">
        <TabPane tab="Application Metrics" key="1">

        <Row gutter={32} style={{ margin: 20 }}>
              <Col span={12} >
                  <Card  bodyStyle={{padding:10}}>
                      <LatencyLineChart data={props.serviceMetrics} />        
                  </Card>
              </Col>

              <Col span={12}>
                  <Card  bodyStyle={{padding:10}}>
                       <RequestRateChart data={props.serviceMetrics} />        
                  </Card>
              </Col>
        </Row>

        <Row gutter={32} style={{ margin: 20 }}>
            <Col span={12}>
                <Card bodyStyle={{padding:10}}>
                    <ErrorRateChart data={props.serviceMetrics} />       
                </Card>      
            </Col>

            <Col span={12}>
                <Card bodyStyle={{padding:10}}>
                    <TopEndpointsTable data={props.topEndpointsList} />       
                </Card>     
            </Col>
        </Row>
        </TabPane>

        <TabPane tab="External Calls" key="2">
          <div style={{ margin: 20 }}> Coming Soon.. </div>
          <div className="container" style={{ display: 'flex', flexFlow: 'column wrap' }}>
          
                <div className='row'>
                    <div className='col-md-6 col-sm-12 col-12'>
                        
                        {/* <ChartJSLineChart data={this.state.graphData} />       */}
                    </div>
                    <div className='col-md-6 col-sm-12 col-12'>
                        {/* <ChartJSLineChart data={this.state.graphData} />        */}
                    </div>
                </div>
          </div>
        </TabPane>
      </Tabs>
    );
}

const mapStateToProps = (state: StoreState): { serviceMetrics: metricItem[], topEndpointsList: topEndpointListItem[],globalTime: GlobalTime} => {

  return {  serviceMetrics : state.serviceMetrics, topEndpointsList: state.topEndpointsList, globalTime:state.globalTime};
};
// the name mapStateToProps is only a convention
// take state and map it to props which are accessible inside this component

export const ServiceMetrics  = connect(mapStateToProps, {
  getServicesMetrics: getServicesMetrics,
  getTopEndpoints: getTopEndpoints,
})(_ServiceMetrics);

