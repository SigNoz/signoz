import React,{Suspense}  from 'react';
import {Spin} from 'antd';


import {  BrowserRouter as Router,  Route, Switch  } from 'react-router-dom';


const Signup = React.lazy(() => import('./Signup'));
const App = React.lazy(() => import('./App'));



const AppWrapper = () =>  {

    return(

        <Router basename="/">

        <Suspense fallback={<Spin size="large" />}>
                <Switch>
                    <Route path="/signup" exact component={Signup} />

                    <Route path="/" exact component={App}/>

                </Switch>
        </Suspense>

        </Router>
    );


}

export default AppWrapper; 
