import { SFlatList, SFloatingButton, SIcon, SText } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SInputSearch, SNoContent } from '@components/modelucules';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SAFE_AREA_PADDING, pagePaddingPx } from '@constants/constants';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { characterizationOptionsList } from '@constants/maps/characterization-options.map';
import { characterizationMap } from '@constants/maps/characterization.map';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTableSearch } from '@hooks/useTableSearchOld';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { withObservables } from '@nozbe/watermelondb/react';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useEffect, useMemo, useState } from 'react';
import sortArray from 'sort-array';
import EnhancedCharacterizationCard from './CharacterizationCard';
import { ActivityIndicator } from 'react-native';

type Props = {
    characterizations?: CharacterizationModel[];
    workspace: WorkspaceModel;
};

export function CharacterizationList({ characterizations, workspace }: Props): React.ReactElement {
    const [page, setPage] = useState(1);
    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const [activeType, setActiveType] = useState<CharacterizationTypeEnum | null>(null);
    const rowsPerPage = 10;

    const handleCreateCharacterization = () => {
        navigate('characterization', { workspaceId: workspace.id, type: activeType || undefined });
    };

    const characterizationsFiltered = useMemo(() => {
        if (!characterizations) return [];
        if (!activeType) return characterizations;

        return characterizations?.filter((characterization) => characterization.type === activeType);
    }, [activeType, characterizations]);

    const { handleSearchChange, results, search } = useTableSearch({
        data: characterizationsFiltered,
        keys: ['name'],
        threshold: 0,
        sortFunction: (array) =>
            sortArray(array, {
                by: ['typeOrder', 'done_at', 'name'],
                order: ['asc', 'asc', 'asc'],
                computed: {
                    typeOrder: (row) => characterizationMap[row.type]?.order,
                },
            }),
    });

    const loadMoreData = () => {
        const endOfList = results.length <= page * rowsPerPage;
        if (endOfList) return;

        setPage((prev) => prev + 1);
    };

    useEffect(() => {
        setPage(1);
    }, [search]);

    const resultsFiltered = results?.slice(0, page * rowsPerPage) || [];

    return (
        <>
            <SInputSearch mb={-1} mx={'pagePaddingPx'} onSearchChange={handleSearchChange} />
            <SHorizontalMenu
                mb={4}
                onChange={(value) => setActiveType(value.type)}
                options={characterizationOptionsList}
                getKeyExtractor={(item) => item.value}
                getLabel={(item) => item.label}
                getIsActive={(item) => item.type === activeType}
            />

            <SFloatingButton
                renderInPortal={false}
                shadow={2}
                placement="bottom-right"
                size="md"
                bg="green.500"
                _pressed={{ bg: 'green.700' }}
                icon={<SIcon color="white" as={MaterialIcons} name="add" size="4" />}
                label="Adicionar"
                bottom={SAFE_AREA_PADDING.paddingBottom}
                onPress={() => handleCreateCharacterization()}
            />

            {!!characterizationsFiltered?.length && (
                <SFlatList
                    data={resultsFiltered}
                    keyExtractor={(item) => item.id}
                    // keyboardShouldPersistTaps={'handled'}
                    renderItem={({ item }) => <EnhancedCharacterizationCard characterization={item} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pagePaddingPx, paddingBottom: 50 }}
                    onEndReached={loadMoreData}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        resultsFiltered.length != results?.length ? <ActivityIndicator size="large" /> : null
                    }
                />
            )}
            {!characterizationsFiltered?.length && <SNoContent mx="pagePaddingPx" />}
            <SText ml={4}>Total: {results.length}</SText>
        </>
    );
}

const enhance = withObservables(['workspace'], ({ workspace }) => {
    let characterizations: any;

    try {
        characterizations = workspace.characterizationsList;
    } catch (error) {
        characterizations = undefined;
    }

    return {
        ...(characterizations && { characterizations }),
        workspace,
    };
});

const EnhancedCharacterizationList = enhance(CharacterizationList);

export function RenderEnhancedCharacterizationList({ workspace }: { workspace?: WorkspaceModel }) {
    try {
        if (workspace) return <EnhancedCharacterizationList workspace={workspace} />;
        return null;
    } catch (e) {
        return null;
    }
}

export default RenderEnhancedCharacterizationList;
