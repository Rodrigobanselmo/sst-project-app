import React, { useCallback, useImperativeHandle, useState } from 'react';
import { RiskDataFormProps, RiskDataFormSelectedProps, RiskFactorActivities } from '../../types';
// import * as ImagePicker from 'expo-image-picker';
import { SSearchSimpleModal } from '@components/organisms/SSearchModal/components/SSearchSimpleModal';
import { RecTypeEnum } from '@constants/enums/risk.enum';
import { IReturnUseFuseSearch, useFuseFuncSearch } from '@hooks/useFuseFuncSearch';
import { GenerateSourceModel } from '@libs/watermelon/model/GenerateSourceModel';
import { RecMedModel } from '@libs/watermelon/model/RecMedModel';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { useFetchQueryEpis } from '@services/api/epis/useQueryEpis';
import { isNaEpi, isNaRecMed } from '@utils/helpers/isNa';
import { Alert } from 'react-native';
import sortArray from 'sort-array';
import { SSelectSimpleModal } from '@components/organisms/SSearchModal/components/SSelectSimpleModal';

type modalOpenType = 'gs' | 'epi' | 'eng' | 'adm' | 'rec' | 'activity' | false;

export type RiskDataSearchModal = {
    setOpenModal: (value: modalOpenType) => void;
    getOpen: () => modalOpenType;
};

type PageProps = {
    form: RiskDataFormProps;
    onEditForm: (form: Partial<RiskDataFormProps>) => void;
    risk?: RiskModel | null;
    modalRef?: React.Ref<RiskDataSearchModal>;
};

type DataProps = {
    name: string;
    descriptions?: string[];
    description?: string;
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

export const getEquipmentName = (item: { ca: string; equipment: string }) => {
    const isNa = isNaEpi(item.ca);
    const equipment = item.equipment;

    const name = isNa ? equipment : `${item.ca}: ${equipment}`;

    return name;
};

export function RiskDataModalSearch({ onEditForm, form, risk, modalRef }: PageProps): React.ReactElement {
    const [isOpen, setIsOpen] = useState<modalOpenType>(false);

    useImperativeHandle(modalRef, () => ({
        setOpenModal: (value: modalOpenType) => setIsOpen(value),
        getOpen: () => isOpen,
    }));

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

    const removeDuplicatesAndOrder = useCallback((data: DataProps[]) => {
        const uniqueItems: Record<string, DataProps> = {};

        data.forEach((item) => {
            if (!uniqueItems[item.name]) {
                uniqueItems[item.name] = item;
            }
        });
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
                            const name = getEquipmentName(item);

                            return { name, id: String(item.id), description: item.ca };
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

    const isActivity = isOpen === 'activity';

    const onGetTitle = () => {
        if (isOpen === 'gs') return 'Fontes Geradoras';
        if (isOpen === 'epi') return 'EPIs';
        if (isOpen === 'eng') return 'Medidas de Engenharia';
        if (isOpen === 'adm') return 'Medidas Administrativas';
        if (isOpen === 'rec') return 'Recomendações';
        if (isActivity) return 'Atividades';

        return '';
    };

    const onGetKey = () => {
        if (isOpen === 'epi') return 'episToRiskData';
        if (isOpen === 'eng') return 'engsToRiskData';
        if (isOpen === 'adm') return 'admsToRiskData';
        if (isOpen === 'rec') return 'recsToRiskData';
        if (isActivity) return 'activities';

        return 'generateSourcesToRiskData';
    };

    const placeholder = () => {
        if (isOpen === 'epi') return 'Número CA';
        if (isOpen === 'eng') return 'Descrição medida de engenharia';
        if (isOpen === 'adm') return 'Descrição medida administrativa';
        if (isOpen === 'rec') return 'Descrição recomendação';
        if (isActivity) return 'Descrição atividade';

        return 'Nome fonte geradora';
    };

    const key = onGetKey();

    if (!isOpen) return null as any;

    if (isActivity) {
        const activities = JSON.parse(risk?.activities || '[]') as RiskFactorActivities[];
        const results =
            activities?.map<DataProps>((item) => ({
                name: item.description,
                id: item.description,
                descriptions: item.subActivities?.map((sub) => sub.description),
            })) || [];

        return (
            <SSelectSimpleModal
                data={results}
                disableNoInternetContent
                onGetLabel={(item) => item.name}
                onGetDescriptionLabel={(item: string) => item}
                onGetDescriptions={(item) => item.descriptions || ([] as string[])}
                setShowModal={() => setIsOpen(false)}
                showModal={!!isOpen}
                placeholder={placeholder()}
                title={onGetTitle()}
                onSelect={(item, description) =>
                    handleEditSelect({
                        data: {
                            name: item.name,
                            description: description || '',
                            id: item.name + String(description),
                        },
                        key,
                    })
                }
            />
        );
    }

    return (
        <SSearchSimpleModal
            disableNoInternetContent
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
    );
}
