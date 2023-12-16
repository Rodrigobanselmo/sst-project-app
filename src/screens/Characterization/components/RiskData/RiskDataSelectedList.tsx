import { ISBoxProps, SBox, SCenter, SFlatList, SHStack, SIcon, SText, SVStack } from '@components/core';
import React from 'react';
// import * as ImagePicker from 'expo-image-picker';
import { getMatrizRisk } from '@utils/helpers/matriz';
import { UseFormWatch } from 'react-hook-form';
import { IRiskDataValues } from './schemas';
import { SButton } from '@components/modelucules';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';

type CompProps<T> = {
    data?: T[];
    getLabel: (data: T) => string;
    keyExtractor: (data: T) => string;
    title: string;
    onAdd?: () => void;
    onDelete?: (data: T) => void;
    onEfficiencyCheck?: (data: T) => void;
    hideCheck?: (data: T) => boolean;
    getCheck?: (data: T) => boolean;
} & ISBoxProps;

export function RiskDataSelectedItem<T>({
    data,
    getLabel,
    keyExtractor,
    title,
    onAdd,
    onDelete,
    onEfficiencyCheck,
    hideCheck,
    getCheck,
    ...props
}: CompProps<T>): React.ReactElement {
    return (
        <SVStack space={2} {...props}>
            <SHStack alignItems={'center'} justifyContent={'space-between'} mb={2}>
                <SText fontSize={19} color={'text.label'}>
                    {title}
                </SText>
                {onAdd && (
                    <SButton height={7} p={0} addColor width={'100px'} title="adicionar" onPress={() => onAdd()} />
                )}
            </SHStack>

            {!!data?.length && (
                <SVStack space={2}>
                    {data.map((item) => (
                        <SVStack
                            borderWidth={1}
                            borderColor="border.main"
                            px={3}
                            py={1}
                            borderRadius={5}
                            key={keyExtractor(item)}
                            space={1}
                        >
                            <SHStack justifyContent={'space-between'}>
                                <SText fontSize={15} color={'text.main'} flex={1}>
                                    {getLabel(item)}
                                </SText>
                                {onDelete && (
                                    <TouchableOpacity style={{ padding: 4 }} onPress={() => onDelete(item)}>
                                        <SIcon mt={'2px'} as={Feather} name="trash" color="red.600" size={4} />
                                    </TouchableOpacity>
                                )}
                            </SHStack>
                            {onEfficiencyCheck && getCheck && !hideCheck?.(item) && (
                                <TouchableOpacity onPress={() => onEfficiencyCheck(item)}>
                                    <SHStack alignItems={'center'} space={1}>
                                        <SBox
                                            width={4}
                                            height={4}
                                            borderRadius={5}
                                            borderColor={'gray.200'}
                                            borderWidth={2}
                                            {...(getCheck(item) && { bg: 'blue.500', borderColor: 'blue.500' })}
                                        />
                                        <SText fontSize={15} color={'text.main'}>
                                            Eficaz
                                        </SText>
                                    </SHStack>
                                </TouchableOpacity>
                            )}
                        </SVStack>
                    ))}
                </SVStack>
            )}
        </SVStack>
    );
}
