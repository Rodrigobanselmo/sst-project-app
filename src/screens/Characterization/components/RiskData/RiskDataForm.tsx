import { SBox, SHStack, SScrollView, SText, SVStack } from '@components/core';
import React from 'react';
import { RiskDataFormProps, RiskDataFormRelationsProps, RiskDataFormSelectedProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SButton, SInput, SInputArea } from '@components/index';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SLabel } from '@components/modelucules/SLabel';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { RecTypeEnum } from '@constants/enums/risk.enum';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { convertCaToDescription, isNaEpi, isNaRecMed } from '@utils/helpers/isNa';
import { Control, Controller } from 'react-hook-form';
import { Alert } from 'react-native';
import { RiskDataModalSearch, RiskDataSearchModal } from './RiskDataModalSearch';
import { RiskDataSelectedItem } from './RiskDataSelectedList';
import { RiskOcupacionalTag } from './RiskOcupacionalTag';
import { IRiskDataValues } from './schemas';
import { ExposureTypeEnum } from '@constants/enums/exposure.enum';
import { SVerticalMenu } from '@components/modelucules/SVerticalMenu';

type PageProps = {
    form: RiskDataFormProps;
    onEditForm: (form: Partial<RiskDataFormProps>) => void;
    onSaveForm: () => Promise<void>;
    control: Control<IRiskDataValues, any>;
    risk?: RiskModel | null;
};

export function RiskDataForm({ onEditForm, onSaveForm, form, control, risk }: PageProps): React.ReactElement {
    const modalRef = React.useRef<RiskDataSearchModal>(null);

    const handleEditSelect = async ({
        data,
        key,
    }: {
        data: RiskDataFormSelectedProps;
        key: keyof RiskDataFormProps;
    }) => {
        const action = (type?: RecTypeEnum) => {
            const array = form[key] || [];
            if (Array.isArray(array)) {
                const updatedArray = [...array] as RiskDataFormSelectedProps[];
                const index = updatedArray.findIndex((value) => value.name === data.name);

                if (type) data.type = type;
                if (index !== -1) updatedArray[index] = { ...updatedArray[index], ...data };
                else updatedArray.push(data);

                onEditForm({ [key]: updatedArray });
            }
        };

        if (key == 'recsToRiskData' && !data.id) {
            Alert.alert('Selecione', `A recomendação "${data.name}" é de qual tipo?`, [
                {
                    text: 'Engenharia',
                    onPress: () => action(RecTypeEnum.ENG),
                },
                {
                    text: 'Administrativa',
                    onPress: () => action(RecTypeEnum.ADM),
                },
                {
                    text: 'EPI',
                    onPress: () => action(RecTypeEnum.EPI),
                },
            ]);
        } else {
            action();
        }
    };

    const handleDelete = async ({
        data,
        key,
    }: {
        data: RiskDataFormSelectedProps;
        key: keyof RiskDataFormRelationsProps;
    }) => {
        const array = form[key] || [];

        if (Array.isArray(array)) {
            const deleteData = () => {
                const updatedArray = [...array] as RiskDataFormSelectedProps[];
                const index = updatedArray.findIndex((value) => value.name === data.name);

                const [deletedItem] = updatedArray.splice(index, 1);

                const deletedItems = form[`del_${key}`] || [];
                if (deletedItem.m2mId) deletedItems.push(deletedItem.m2mId);

                onEditForm({ [key]: updatedArray, [`del_${key}`]: deletedItems });
            };

            Alert.alert('Remover', `Tem certeza que deseja remover: ${data.name}?`, [
                { text: 'Voltar', style: 'cancel' },
                { text: 'Deletar', onPress: deleteData, style: 'destructive' },
            ]);
        }
    };

    const handleSave = () => {
        onSaveForm();
    };

    return (
        <SVStack flex={1}>
            <SScrollView style={{ paddingTop: 15 }}>
                <SVStack mx={pagePadding}>
                    <SLabel>Probabiidade</SLabel>
                    <SHStack mb={-2}>
                        <Controller
                            defaultValue={'' as any}
                            control={control}
                            name="probability"
                            render={({ field }) => (
                                <SVStack>
                                    <SHorizontalMenu
                                        fontSizeButton={17}
                                        mb={2}
                                        onChange={(val) => field.onChange(val.value)}
                                        paddingHorizontal={0}
                                        options={[
                                            { label: '1', value: 1 },
                                            { label: '2', value: 2 },
                                            { label: '3', value: 3 },
                                            { label: '4', value: 4 },
                                            { label: '5', value: 5 },
                                            { label: '!', value: 6 },
                                        ]}
                                        activeColor="info.main"
                                        getKeyExtractor={(item) => item.value}
                                        getLabel={(item) => item.label}
                                        getIsActive={(item) => item.value === field.value}
                                    />
                                    <RiskOcupacionalTag
                                        mb={8}
                                        severity={risk?.severity || 0}
                                        probability={field.value || 0}
                                    />
                                </SVStack>
                            )}
                        />
                    </SHStack>

                    <SLabel>Exposição</SLabel>
                    <SHStack mb={-2}>
                        <Controller
                            control={control}
                            name="exposure"
                            render={({ field }) => (
                                <SVStack width="100%">
                                    <SVerticalMenu
                                        fontSizeButton={17}
                                        mb={10}
                                        onChange={(val) => field.onChange(val.value)}
                                        paddingHorizontal={0}
                                        options={[
                                            { label: 'Habitual/Intermitente', value: ExposureTypeEnum.HI },
                                            { label: 'Ocasional', value: ExposureTypeEnum.O },
                                            { label: 'Habitual/Permantente', value: ExposureTypeEnum.HP },
                                        ]}
                                        activeColor="info.main"
                                        getKeyExtractor={(item) => item.value}
                                        getLabel={(item) => item.label}
                                        getIsActive={(item) => item.value === field.value}
                                    />
                                </SVStack>
                            )}
                        />
                    </SHStack>

                    {!!risk?.activities?.length && risk?.activities != '[]' && risk?.activities != 'null' && (
                        <>
                            <RiskDataSelectedItem
                                mb={10}
                                data={form.activities}
                                keyExtractor={(item) => item.name}
                                getLabel={(item) => item.name}
                                getDescription={(item) => item.description}
                                title="Atividades"
                                onAdd={() => modalRef.current?.setOpenModal('activity')}
                                onDelete={(data) => handleDelete({ data, key: 'activities' })}
                            />
                            <SBox mt={-5}>
                                <Controller
                                    control={control}
                                    name="realActivity"
                                    render={({ field: { onChange, value } }) => (
                                        <SInputArea
                                            inputProps={{
                                                placeholder: '',
                                                keyboardType: 'default',
                                                autoCapitalize: 'none',
                                                value,
                                                onChangeText: onChange,
                                            }}
                                            startAdornmentText={'Atividade real'}
                                        />
                                    )}
                                />
                            </SBox>
                        </>
                    )}

                    <RiskDataSelectedItem
                        mb={10}
                        data={form.generateSourcesToRiskData}
                        keyExtractor={(item) => item.name}
                        getLabel={(item) => item.name}
                        title="Fontes Geradoras"
                        onAdd={() => modalRef.current?.setOpenModal('gs')}
                        onDelete={(data) => handleDelete({ data, key: 'generateSourcesToRiskData' })}
                    />
                    <RiskDataSelectedItem
                        mb={10}
                        data={form.episToRiskData}
                        keyExtractor={(item) => item.name}
                        getLabel={(item) => convertCaToDescription(item.name)}
                        title="EPIs"
                        onAdd={() => modalRef.current?.setOpenModal('epi')}
                        getCheck={(item) => !!item.efficientlyCheck}
                        onDelete={(data) => handleDelete({ data, key: 'episToRiskData' })}
                        hideCheck={(item) => !!item.description && isNaEpi(item.description)}
                        onEfficiencyCheck={(data) => {
                            handleEditSelect({
                                data: { ...data, efficientlyCheck: !data.efficientlyCheck },
                                key: 'episToRiskData',
                            });
                        }}
                    />

                    <RiskDataSelectedItem
                        mb={10}
                        data={form.engsToRiskData}
                        keyExtractor={(item) => item.name}
                        getLabel={(item) => item.name}
                        title="Medidas de Engenharia"
                        onAdd={() => modalRef.current?.setOpenModal('eng')}
                        getCheck={(item) => !!item.efficientlyCheck}
                        onDelete={(data) => handleDelete({ data, key: 'engsToRiskData' })}
                        hideCheck={(item) => !!item.name && isNaRecMed(item.name)}
                        onEfficiencyCheck={(data) => {
                            handleEditSelect({
                                data: { ...data, efficientlyCheck: !data.efficientlyCheck },
                                key: 'engsToRiskData',
                            });
                        }}
                    />

                    <RiskDataSelectedItem
                        mb={10}
                        data={form.admsToRiskData}
                        keyExtractor={(item) => item.name}
                        getLabel={(item) => item.name}
                        title="Medidas Administrativas"
                        onAdd={() => modalRef.current?.setOpenModal('adm')}
                        onDelete={(data) => handleDelete({ data, key: 'admsToRiskData' })}
                    />

                    <RiskDataSelectedItem
                        mb={10}
                        data={form.recsToRiskData}
                        keyExtractor={(item) => item.name}
                        getLabel={(item) => item.name}
                        title="Recomendações"
                        onAdd={() => modalRef.current?.setOpenModal('rec')}
                        onDelete={(data) => handleDelete({ data, key: 'recsToRiskData' })}
                    />

                    <SLabel>Probabiidade Residual</SLabel>
                    <SHStack mb={-2}>
                        <Controller
                            defaultValue={'' as any}
                            control={control}
                            name="probabilityAfter"
                            render={({ field, formState: { errors } }) => (
                                <SVStack>
                                    <SHorizontalMenu
                                        fontSizeButton={17}
                                        mb={2}
                                        onChange={(val) => field.onChange(val.value)}
                                        paddingHorizontal={0}
                                        options={[
                                            { label: '1', value: 1 },
                                            { label: '2', value: 2 },
                                            { label: '3', value: 3 },
                                            { label: '4', value: 4 },
                                            { label: '5', value: 5 },
                                            { label: '!', value: 6 },
                                        ]}
                                        activeColor="info.main"
                                        getKeyExtractor={(item) => item.value}
                                        getLabel={(item) => item.label}
                                        getIsActive={(item) => item.value === field.value}
                                    />
                                    <RiskOcupacionalTag
                                        mb={8}
                                        severity={risk?.severity || 0}
                                        probability={field.value || 0}
                                    />
                                </SVStack>
                            )}
                        />
                    </SHStack>
                </SVStack>
            </SScrollView>
            <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mx={pagePadding}>
                <SButton size={'sm'} title="Salvar" onPress={handleSave} />
            </SVStack>

            <RiskDataModalSearch modalRef={modalRef} onEditForm={onEditForm} form={form} risk={risk} />
        </SVStack>
    );
}
