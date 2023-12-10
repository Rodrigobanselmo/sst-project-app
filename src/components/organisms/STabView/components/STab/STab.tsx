import { SBox, SHStack, SText } from '@components/core';
import * as React from 'react';
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap, TabBar, SceneRendererProps } from 'react-native-tab-view';
import { THEME } from '../../../../../theme/theme';
import { pagePaddingPx } from '@constants/constants';
import { SButton } from '@components/modelucules';
import { memo } from 'react';

interface ISTabView<T> {
    routes: { label: string; value?: T }[];
    index?: T;
    getIsActive?: (index: number, value?: T) => boolean;
    onClickTab: (value: T | number) => void;
}

export function STab<T>({ routes, index, onClickTab, getIsActive }: ISTabView<T>) {
    return (
        <>
            <SBox mb={'-1px'} zIndex={1}>
                <ScrollView keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} horizontal>
                    <SHStack zIndex={1}>
                        {routes.map((route, _index) => {
                            const focused = getIsActive ? getIsActive(_index, route.value) : _index === index;
                            return (
                                <SButton
                                    key={route.label}
                                    autoWidth
                                    title={route.label}
                                    onPress={() => onClickTab(route.value || _index)}
                                    height={9}
                                    px={4}
                                    py={'3px'}
                                    mt={2}
                                    borderRadius={0}
                                    opacity={focused ? 1 : 0.5}
                                    bg={THEME.colors.background.default}
                                    color={THEME.colors.text.label}
                                    bgPressed={'gray.50'}
                                    pb={'3px'}
                                    {...(focused && {
                                        color: THEME.colors.primary.main,
                                        opacity: 0.6,
                                        borderColor: THEME.colors.primary.main,
                                        borderBottomWidth: 3,
                                        pb: 0,
                                    })}
                                />
                            );
                        })}
                    </SHStack>
                </ScrollView>
            </SBox>
            <View style={{ overflow: 'hidden', paddingBottom: 5, marginBottom: -5, zIndex: 0 }}>
                <View
                    style={{
                        backgroundColor: THEME.colors.background.default,
                        height: 1,
                        shadowColor: '#000',
                        shadowOffset: { width: 1, height: 1 },
                        shadowOpacity: 0.4,
                        shadowRadius: 3,
                        elevation: 5,
                    }}
                />
            </View>
        </>
    );
}
