import { SFlatList, SFloatingButton, SIcon } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SInputSearch, SNoContent } from '@components/modelucules';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SAFE_AREA_PADDING, pagePaddingPx } from '@constants/constants';
import { CharacterizationTypeEnum } from '@constants/enums/characterization-type.enum';
import { characterizationOptionsList } from '@constants/maps/characterization-options.map';
import { characterizationMap } from '@constants/maps/characterization.map';
import { MaterialIcons } from '@expo/vector-icons';
import { useTableSearch } from '@hooks/useTableSearchOld';
import { CharacterizationModel } from '@libs/watermelon/model/CharacterizationModel';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { withObservables } from '@nozbe/watermelondb/react';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useMemo, useState } from 'react';
import sortArray from 'sort-array';
import EnhancedCharacterizationCard from './CharacterizationCard';

type Props = {
    characterizations?: CharacterizationModel[];
    workspace: WorkspaceModel;
};

export function CharacterizationList({ characterizations, workspace }: Props): React.ReactElement {
    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const [activeType, setActiveType] = useState<CharacterizationTypeEnum | null>(null);

    const handleCreateCharacterization = () => {
        navigate('characterization', { workspaceId: workspace.id, type: activeType || undefined });
    };

    const characterizationsFiltered = useMemo(() => {
        if (!characterizations) return [];
        if (!activeType) return characterizations;

        return characterizations?.filter((characterization) => characterization.type === activeType);
    }, [activeType, characterizations]);

    const { handleSearchChange, results } = useTableSearch({
        data: characterizationsFiltered,
        keys: ['name'],
        sortFunction: (array) =>
            sortArray(array, {
                by: ['typeOrder', 'name'],
                order: ['asc', 'asc'],
                computed: {
                    typeOrder: (row) => characterizationMap[row.type]?.order,
                },
            }),
    });

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
                    data={results || []}
                    keyExtractor={(item) => item.id}
                    // keyboardShouldPersistTaps={'handled'}
                    renderItem={({ item }) => <EnhancedCharacterizationCard characterization={item} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pagePaddingPx }}
                />
            )}
            {!characterizationsFiltered?.length && <SNoContent mx="pagePaddingPx" />}
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
