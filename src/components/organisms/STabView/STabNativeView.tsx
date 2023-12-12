import { SBox, SHStack, SText } from '@components/core';
import * as React from 'react';
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap, TabBar, SceneRendererProps } from 'react-native-tab-view';
import { THEME } from '../../../theme/theme';
import { pagePaddingPx } from '@constants/constants';
import { SButton } from '@components/modelucules';
import { memo } from 'react';
import { STab } from './components/STab';

export interface ISTabViewRefProps {
    setRouteIndex: React.Dispatch<React.SetStateAction<number>>;
    routeIndex: number;
}
interface ISTabView {
    // renderScene: (props: SceneRendererProps & { route: any; setIndex: (index: number) => void }) => React.ReactNode;
    routes: { label: string; component: React.JSX.Element }[];
    renderTabBar?: (props: any) => React.ReactNode;
    tabsRef?: React.RefObject<ISTabViewRefProps>;
}

// eslint-disable-next-line react/prop-types
const Tab = memo(({ children }: { children: React.ReactNode }) => {
    return children;
});

export const STabNativeView = ({ routes, tabsRef }: ISTabView) => {
    const [index, setIndex] = React.useState(0);
    const [openedIndex, setOpenedIndex] = React.useState([0]);

    React.useImperativeHandle(
        tabsRef,
        (): ISTabViewRefProps => ({
            setRouteIndex: setIndex,
            routeIndex: index,
        }),
    );

    const onClickTab = (_index: number) => {
        if (_index != index) setIndex(_index);
        if (!openedIndex.includes(_index)) {
            setOpenedIndex((prev) => [...prev, _index]);
        }
    };

    return (
        <>
            <STab routes={routes} index={index} onClickTab={onClickTab} />
            {routes.map((route, _index) => {
                const focused = _index === index;
                const opened = openedIndex.includes(_index);

                if (!opened) {
                    return null;
                }

                return (
                    <Tab key={route.label}>
                        <SBox display={focused ? 'flex' : 'none'} flex={1}>
                            {route.component}
                        </SBox>
                    </Tab>
                );
            })}
        </>
    );
};
