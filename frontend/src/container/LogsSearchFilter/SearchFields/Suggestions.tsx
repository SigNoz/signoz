import { Typography, Button } from 'antd';
import React from 'react';
import FieldKey from './FieldKey';
import { CategoryHeading } from './styles';

function SuggestedItem({ name, type }) {
    return (
        <Button type='text' style={{display:'block'}}>
            <FieldKey name={name} type={type} />
        </Button>
    );
}

function Suggestions() {
    return (
        <div>
            <CategoryHeading >
                SUGGESTIONS
            </CategoryHeading>
            <div >
                <SuggestedItem name="host_string" type={'string'} />
                <SuggestedItem name="file_name" type={'string'} />
                <SuggestedItem name="proc_id" type={'integer'} />
            </div>
        </div>
    );
}

export default Suggestions;
