import React from 'react'
import QueryBuilder from './QueryBuilder';

import Suggestions from './Suggestions';

function SearchFields() {
    return <>
        <QueryBuilder />
        <Suggestions />
    </>
}

export default SearchFields;
