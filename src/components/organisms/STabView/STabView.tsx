import { SBox, SText } from '@components/core';
import * as React from 'react';
import { TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { THEME } from '../../../theme/theme';

interface ISTabView {
    renderScene: ReturnType<typeof SceneMap>;
    onIndexChange: (index: number) => void;
    index: number;
    pt?: number;
    routes: { key: string; title: string }[];
    renderTabBar?: (props: any) => React.ReactNode;
}

export function STabView({ renderScene, index, pt, onIndexChange, routes, renderTabBar }: ISTabView) {
    const layout = useWindowDimensions();

    return (
        <TabView
            navigationState={{ index, routes }}
            renderScene={renderScene}
            onIndexChange={onIndexChange}
            sceneContainerStyle={{ paddingTop: pt }}
            initialLayout={{ width: layout.width }}
            renderTabBar={({ jumpTo, ...rest }) => (
                <TabBar
                    {...rest}
                    jumpTo={jumpTo}
                    scrollEnabled
                    tabStyle={{ width: 105 }}
                    style={{
                        backgroundColor: THEME.colors.background.default,
                    }}
                    activeColor={THEME.colors.primary.main}
                    indicatorStyle={{
                        backgroundColor: THEME.colors.primary.main,
                    }}
                    contentContainerStyle={{
                        height: 40,
                        // borderBottomWidth: 1,
                        // borderBottomColor: THEME.colors.border.main,
                    }}
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
            {...(renderTabBar && { renderTabBar })}
        />
    );
}
