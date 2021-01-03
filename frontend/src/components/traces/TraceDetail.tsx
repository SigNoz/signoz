import React from 'react';
import  {TraceCustomVisualizations}  from './TraceCustomVisualizations';
import { TraceFilter } from './TraceFilter';
import { TraceList } from './TraceList';




const TraceDetail = () => {
    // const [serviceName, setServiceName] = useState('Frontend'); //default value of service name

        return (

            <div>
                {/* <div>Tracing Detail Page</div> */}
                <TraceFilter />
                {/* <TraceFilter servicename={serviceName} /> */}
                <TraceCustomVisualizations />
                <TraceList />
            </div>
        );
    
}

export default TraceDetail;