import { SFlatList, SFloatingButton, SIcon, SText } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SInputSearch, SNoContent } from '@components/modelucules';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { pagePaddingPx } from '@constants/constants';
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
import { ReactNode, useEffect, useMemo, useState } from 'react';
import sortArray from 'sort-array';
import EnhancedCharacterizationCard from './CharacterizationCard';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
    characterizations?: CharacterizationModel[];
    workspace: WorkspaceModel;
    listHeader?: ReactNode;
};

export function CharacterizationList({ characterizations, workspace, listHeader }: Props): React.ReactElement {
    const insets = useSafeAreaInsets();
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
            <SFloatingButton
                renderInPortal={false}
                shadow={2}
                placement="bottom-right"
                size="md"
                bg="green.500"
                _pressed={{ bg: 'green.700' }}
                icon={<SIcon color="white" as={MaterialIcons} name="add" size="4" />}
                label="Adicionar"
                bottom={`${insets.bottom + 16}px`}
                onPress={() => handleCreateCharacterization()}
            />

            <SFlatList
                style={styles.list}
                data={resultsFiltered}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => <View style={styles.row}><EnhancedCharacterizationCard characterization={item} /></View>}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
                onEndReached={loadMoreData}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={<>
                    {listHeader}
                    <SInputSearch mb={-1} mx={pagePaddingPx} onSearchChange={handleSearchChange} />
                    <SHorizontalMenu
                        mb={4}
                        onChange={(value) => setActiveType(value.type)}
                        options={characterizationOptionsList}
                        getKeyExtractor={(item) => item.value}
                        getLabel={(item) => item.label}
                        getIsActive={(item) => item.type === activeType}
                    />
                </>}
                ListEmptyComponent={<SNoContent mx="pagePaddingPx" />}
                ListFooterComponent={<View style={styles.footer}>
                    {resultsFiltered.length !== results.length && <ActivityIndicator size="large" />}
                    <SText>Total: {results.length}</SText>
                </View>}
            />
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

export function RenderEnhancedCharacterizationList({ workspace, listHeader }: { workspace?: WorkspaceModel; listHeader?: ReactNode }) {
    try {
        if (workspace) return <EnhancedCharacterizationList workspace={workspace} listHeader={listHeader} />;
        return null;
    } catch (e) {
        return null;
    }
}

export default RenderEnhancedCharacterizationList;

const styles = StyleSheet.create({
    list: { flex: 1 },
    content: { flexGrow: 1 },
    row: { paddingHorizontal: pagePaddingPx },
    footer: { paddingHorizontal: pagePaddingPx, paddingTop: 12 },
});
