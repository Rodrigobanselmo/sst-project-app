import { SBox, SText } from '@components/core';
import * as React from 'react';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap, TabBar, SceneRendererProps } from 'react-native-tab-view';
import { THEME } from '../../../theme/theme';

interface ISTabViewRefProps {
    setRouteIndex: React.Dispatch<React.SetStateAction<number>>;
    routeIndex: number;
}
interface ISTabView {
    // renderScene: (props: SceneRendererProps & { route: any; setIndex: (index: number) => void }) => React.ReactNode;
    routes: { label: string; component: React.JSX.Element }[];
    renderTabBar?: (props: any) => React.ReactNode;
    tabsRef?: React.RefObject<any>;
}

export const STabView = ({ routes, tabsRef, ...props }: ISTabView) => {
    const layout = useWindowDimensions();

    const [index, setIndex] = React.useState(0);
    const routesState = routes.map((route, index) => ({ key: String(index), title: route.label }));

    React.useImperativeHandle(
        tabsRef,
        (): ISTabViewRefProps => ({
            setRouteIndex: setIndex,
            routeIndex: index,
        }),
    );

    const childrenMap = React.useMemo(() => {
        return routes.reduce((acc, { component }, index) => ({ ...acc, [String(index)]: () => component }), {});
    }, [routes]);

    const renderScene = SceneMap(childrenMap);

    return (
        <TabView
            navigationState={{ index, routes: routesState }}
            renderScene={renderScene}
            onIndexChange={setIndex}
            initialLayout={{ width: layout.width }}
            renderTabBar={({ jumpTo, ...rest }) => (
                <TabBar
                    {...rest}
                    jumpTo={jumpTo}
                    scrollEnabled
                    tabStyle={{ width: 105 }}
                    style={{ backgroundColor: THEME.colors.background.default }}
                    activeColor={THEME.colors.primary.main}
                    indicatorStyle={{ backgroundColor: THEME.colors.primary.main }}
                    contentContainerStyle={{ height: 40 }}
                    renderLabel={({ route, focused }) => (
                        <SText
                            style={{
                                marginTop: -6,
                                color: focused ? THEME.colors.primary.main : THEME.colors.text.main,
                                opacity: focused ? 1 : 0.5,
                            }}
                        >
                            {route.title}
                        </SText>
                    )}
                />
            )}
        />
    );
};
