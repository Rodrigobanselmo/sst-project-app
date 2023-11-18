import { SHStack, SScrollView, SVStack } from '@components/core';
import React, { useCallback, useState } from 'react';
import { RiskDataFormProps, RiskDataFormRelationsProps, RiskDataFormSelectedProps } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SButton } from '@components/index';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SLabel } from '@components/modelucules/SLabel';
import { SSearchSimpleModal } from '@components/organisms/SSearchModal/components/SSearchSimpleModal';
import { SAFE_AREA_PADDING, pagePadding } from '@constants/constants';
import { RecTypeEnum } from '@constants/enums/risk.enum';
import { IReturnUseFuseSearch, useFuseFuncSearch } from '@hooks/useFuseFuncSearch';
import { GenerateSourceModel } from '@libs/watermelon/model/GenerateSourceModel';
import { RecMedModel } from '@libs/watermelon/model/RecMedModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { useFetchQueryEpis } from '@services/api/epis/useQueryEpis';
import { convertCaToDescription, isNaEpi, isNaRecMed } from '@utils/helpers/isNa';
import { Control, Controller, UseFormWatch } from 'react-hook-form';
import { Alert } from 'react-native';
import sortArray from 'sort-array';
import { RiskDataSelectedItem } from './RiskDataSelectedList';
import { RiskOcupacionalTag } from './RiskOcupacionalTag';
import { IRiskDataValues } from './schemas';

type PageProps = {
    form: RiskDataFormProps;
    onEditForm: (form: Partial<RiskDataFormProps>) => void;
    onSaveForm: () => Promise<void>;
    control: Control<IRiskDataValues, any>;
    isEdit?: boolean;
    watch: UseFormWatch<IRiskDataValues>;
    risk?: RiskModel | null;
};

type DataProps = {
    name: string;
    id: string;
};

const sortFunctionRecMec = (array: any[]) =>
    sortArray(array, {
        by: ['typeOrder', 'name'],
        order: ['desc', 'asc'],
        computed: {
            typeOrder: (row) => isNaRecMed(row.name),
        },
    });

const sortFunctionGS = (array: any[]) =>
    sortArray(array, {
        by: ['name'],
        order: ['asc'],
    });

export function RiskDataForm({
    onEditForm,
    onSaveForm,
    form,
    control,
    isEdit,
    watch,
    risk,
}: PageProps): React.ReactElement {
    const [isOpen, setIsOpen] = useState<'gs' | 'epi' | 'eng' | 'adm' | 'rec' | false>(false);
    const generateSourseSerach = useFuseFuncSearch<DataProps>({
        keys: ['name'],
        fuseOptions: { threshold: 0.6 },
        sortFunction: sortFunctionGS,
    });
    const engsSearch = useFuseFuncSearch<DataProps>({
        keys: ['medName'],
        fuseOptions: { threshold: 0.6 },
        sortFunction: sortFunctionRecMec,
    });
    const admsSearch = useFuseFuncSearch<DataProps>({
        keys: ['medName'],
        fuseOptions: { threshold: 0.6 },
        sortFunction: sortFunctionRecMec,
    });
    const recsSearch = useFuseFuncSearch<DataProps>({
        keys: ['recName'],
        fuseOptions: { threshold: 0.6 },
        sortFunction: sortFunctionRecMec,
    });

    const { fetchEpis } = useFetchQueryEpis();

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

    const removeDuplicatesAndOrder = useCallback((data: DataProps[]) => {
        const uniqueItems: Record<string, DataProps> = {};

        data.forEach((item) => {
            if (!uniqueItems[item.name]) {
                uniqueItems[item.name] = item;
            }
        });
        console.log(uniqueItems);
        const uniqueItemsArray = Object.values(uniqueItems);
        return uniqueItemsArray;
    }, []);

    const onGetRiskRelations = useCallback(
        async (search: string, options: { key: keyof RiskModel; fuseSearch: IReturnUseFuseSearch<DataProps> }) => {
            let results: DataProps[] = [];

            if (risk && risk[options.key]) {
                try {
                    const data: GenerateSourceModel[] | RecMedModel[] = await (risk[options.key] as any)?.fetch();
                    if (data) {
                        const isGenerateSource = options.key === 'allGenerateSources';
                        const isRecName = options.key === 'allRec';

                        const itemKey = isGenerateSource ? 'name' : isRecName ? 'recName' : 'medName';

                        const resultData = data.map<DataProps>((item) => ({
                            name: (item as any)?.[itemKey],
                            id: item.id,
                        }));

                        results = options.fuseSearch.getResult({ data: removeDuplicatesAndOrder(resultData), search });
                    }
                } catch (e) {
                    console.error(e);
                    /* empty */
                }
            }

            return results || [];
        },
        [risk, removeDuplicatesAndOrder],
    );

    const onGetEpis = useCallback(
        async (search: string) => {
            let results: DataProps[] = [];

            if (risk) {
                try {
                    const result = await fetchEpis({ ca: search }, 5);
                    const data = result?.data;
                    if (data) {
                        const resultData = data.map<DataProps>((item) => {
                            const isNa = isNaEpi(item.ca);
                            const equipment = item.equipment;
                            // const equipment = addDotsText({ text: item.equipment, maxLength: 40 });

                            const name = isNa ? equipment : `${item.ca}: ${equipment}`;

                            return { name, id: String(item.ca) };
                        });
                        results = resultData;
                    }
                } catch (e) {
                    console.error(e);
                    /* empty */
                }
            }

            return results || [];
        },
        [fetchEpis, risk],
    );

    const onGetData = useCallback(
        async (search: string) => {
            let results: DataProps[] = [];

            if (isOpen === 'gs') {
                results = await onGetRiskRelations(search, {
                    key: 'allGenerateSources',
                    fuseSearch: generateSourseSerach,
                });
            } else if (isOpen === 'eng') {
                results = await onGetRiskRelations(search, { key: 'allEng', fuseSearch: engsSearch });
            } else if (isOpen === 'adm') {
                results = await onGetRiskRelations(search, { key: 'allAdm', fuseSearch: admsSearch });
            } else if (isOpen === 'rec') {
                results = await onGetRiskRelations(search, { key: 'allRec', fuseSearch: recsSearch });
            } else if (isOpen === 'epi') {
                results = await onGetEpis(search);
            }

            return results;
        },
        [admsSearch, engsSearch, generateSourseSerach, isOpen, onGetEpis, onGetRiskRelations, recsSearch],
    );

    const onGetTitle = () => {
        if (isOpen === 'gs') return 'Fontes Geradoras';
        if (isOpen === 'epi') return 'EPIs';
        if (isOpen === 'eng') return 'Medidas de Engenharia';
        if (isOpen === 'adm') return 'Medidas Administrativas';
        if (isOpen === 'rec') return 'Recomendações';

        return '';
    };

    const onGetKey = () => {
        if (isOpen === 'epi') return 'episToRiskData';
        if (isOpen === 'eng') return 'engsToRiskData';
        if (isOpen === 'adm') return 'admsToRiskData';
        if (isOpen === 'rec') return 'recsToRiskData';

        return 'generateSourcesToRiskData';
    };

    const placeholder = () => {
        if (isOpen === 'epi') return 'Número CA';
        if (isOpen === 'eng') return 'Descrição medida de engenharia';
        if (isOpen === 'adm') return 'Descrição medida administrativa';
        if (isOpen === 'rec') return 'Descrição recomendação';

        return 'Nome fonte geradora';
    };

    const key = onGetKey();

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
                            render={({ field, formState: { errors } }) => (
                                <SHorizontalMenu
                                    fontSizeButton={17}
                                    mb={4}
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
                                    activeColor="primary.light"
                                    getKeyExtractor={(item) => item.value}
                                    getLabel={(item) => item.label}
                                    getIsActive={(item) => item.value === field.value}
                                />
                            )}
                        />
                    </SHStack>
                    <RiskOcupacionalTag keyValue="probability" mb={8} severity={risk?.severity || 0} watch={watch} />

                    <RiskDataSelectedItem
                        mb={10}
                        data={form.generateSourcesToRiskData}
                        keyExtractor={(item) => item.name}
                        getLabel={(item) => item.name}
                        title="Fontes Geradoras"
                        onAdd={() => setIsOpen('gs')}
                        onDelete={(data) => handleDelete({ data, key: 'generateSourcesToRiskData' })}
                    />
                    <RiskDataSelectedItem
                        mb={10}
                        data={form.episToRiskData}
                        keyExtractor={(item) => item.name}
                        getLabel={(item) => convertCaToDescription(item.name)}
                        title="EPIs"
                        onAdd={() => setIsOpen('epi')}
                        getCheck={(item) => !!item.efficientlyCheck}
                        onDelete={(data) => handleDelete({ data, key: 'episToRiskData' })}
                        hideCheck={(item) => !!item.id && isNaEpi(item.id)}
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
                        onAdd={() => setIsOpen('eng')}
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
                        onAdd={() => setIsOpen('adm')}
                        onDelete={(data) => handleDelete({ data, key: 'admsToRiskData' })}
                    />

                    <RiskDataSelectedItem
                        mb={10}
                        data={form.recsToRiskData}
                        keyExtractor={(item) => item.name}
                        getLabel={(item) => item.name}
                        title="Recomendações"
                        onAdd={() => setIsOpen('rec')}
                        onDelete={(data) => handleDelete({ data, key: 'recsToRiskData' })}
                    />

                    <SLabel>Probabiidade Residual</SLabel>
                    <SHStack mb={-2}>
                        <Controller
                            defaultValue={'' as any}
                            control={control}
                            name="probabilityAfter"
                            render={({ field, formState: { errors } }) => (
                                <SHorizontalMenu
                                    fontSizeButton={17}
                                    mb={4}
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
                                    activeColor="primary.light"
                                    getKeyExtractor={(item) => item.value}
                                    getLabel={(item) => item.label}
                                    getIsActive={(item) => item.value === field.value}
                                />
                            )}
                        />
                    </SHStack>
                    <RiskOcupacionalTag
                        keyValue="probabilityAfter"
                        mb={8}
                        severity={risk?.severity || 0}
                        watch={watch}
                    />
                </SVStack>
            </SScrollView>
            <SVStack mb={SAFE_AREA_PADDING.paddingBottom} mx={pagePadding}>
                <SButton size={'sm'} title="Salvar" onPress={handleSave} />
            </SVStack>

            <SSearchSimpleModal
                onGetLabel={(item) => item.name}
                setShowModal={() => setIsOpen(false)}
                showModal={!!isOpen}
                placeholder={placeholder()}
                onFetchFunction={onGetData}
                title={onGetTitle()}
                onSelect={(item) => handleEditSelect({ data: item, key })}
                onConfirm={(value) => handleEditSelect({ data: { name: value }, key })}
                onConfirmInput={(value) => handleEditSelect({ data: { name: value }, key })}
            />
        </SVStack>
    );
}
