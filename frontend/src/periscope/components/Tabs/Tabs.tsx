import { Tabs as AntDTabs } from 'antd';

export interface TabProps {
    label: string | React.ReactElement
    key: string
    children: React.ReactElement
}


export interface TabsProps {
    items: TabProps[]
}

export default function Tabs({
    items
}: TabsProps) {
    return (
        <AntDTabs
            defaultActiveKey="1"
            centered
            items={items}
        />
    )
}
