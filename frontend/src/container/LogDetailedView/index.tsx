import { Drawer } from 'antd';
import React from 'react';

function LogDetailedView() {
    return null;

    return (
        <Drawer
            title="Basic Drawer"
            placement="right"
            closable={false}
            // onClose={onClose}
            visible={false}
            getContainer={false}
            style={{ position: 'absolute' }}
        >
            <p>Some contents...</p>
        </Drawer>
    );
}

export default LogDetailedView
