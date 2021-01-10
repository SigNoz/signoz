import React,{Suspense, useState}  from 'react';
import {Spin} from 'antd';


import {  BrowserRouter as Router,  Route, Switch, Redirect  } from 'react-router-dom';


const Signup = React.lazy(() => import('./Signup'));
const App = React.lazy(() => import('./App'));



const AppWrapper = () =>  {

    const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);

    return(

        <Router basename="/">

        <Suspense fallback={<Spin size="large" />}>
                <Switch>
                    <Route path="/signup" exact component={Signup} />
                    <Route path="/application" exact component={App} />
                    <Route path="/application/:servicename" component={App}/> 
                  <Route path="/service-map" component={App}/>
                  <Route path="/traces" exact component={App}/>
                  <Route path="/traces/:id" component={App}/>
                  <Route path="/usage-explorer" component={App}/>

                    <Route path="/" exact 
                    render={() => {
                        return (
                         localStorage.getItem('isLoggedIn')==='yes' ?
                          <Redirect to="/application" /> :
                          <Redirect to="/signup" /> 
                        )
                    }}
                    
                    />

                    

                </Switch>
        </Suspense>

        </Router>
    );


}

export default AppWrapper; 
