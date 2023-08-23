import { SFlatList, SFloatingButton, SIcon, useSToast } from '@components/core';
// import * as ImagePicker from 'expo-image-picker';
import { SInputSearch, SNoContent } from '@components/modelucules';
import { SHorizontalMenu } from '@components/modelucules/SHorizontalMenu';
import { SAFE_AREA_PADDING, pagePaddingPx } from '@constants/constants';
import { characterizationOptionsList } from '@constants/maps/characterization-options.map';
import { characterizationMap } from '@constants/maps/characterization.map';
import { MaterialIcons } from '@expo/vector-icons';
import { useTableSearch } from '@hooks/useTableSearch';
import withObservables from '@nozbe/with-observables';
import { useNavigation } from '@react-navigation/native';
import { AppNavigatorRoutesProps } from '@routes/app/AppRoutesProps';
import { useMemo, useState } from 'react';
import sortArray from 'sort-array';
import EnhancedRiskCard from './RiskCard';
import { RiskModel } from '@libs/watermelon/model/RiskModel';
import { UserAuthModel } from '@libs/watermelon/model/UserAuthModel';
import { RiskEnum } from '@constants/enums/risk.enum';
import { riskOptionsList } from '@constants/maps/risk-options.map';

type Props = {
    risks?: RiskModel[];
    user: UserAuthModel;
};

export function RiskList({ risks, user }: Props): React.ReactElement {
    const [activeType, setActiveType] = useState<RiskEnum | null>(null);
    const { navigate } = useNavigation<AppNavigatorRoutesProps>();
    const toast = useSToast();

    const handleCreateRisk = () => {
        // navigate('characterization', { workspaceId: user.id });
    };

    const risksFiltered = useMemo(() => {
        if (!risks) return [];
        if (!activeType) return risks;

        return risks?.filter((characterization) => characterization.type === activeType);
    }, [activeType, risks]);

    const { handleSearchChange, results } = useTableSearch({
        data: risksFiltered,
        keys: ['name'],
        rowsPerPage: 50,
        sortFunction: (array) =>
            sortArray(array, {
                by: ['name'],
                order: ['asc'],
            }),
    });

    return (
        <>
            <SInputSearch mb={-1} mx={'pagePaddingPx'} onSearchChange={handleSearchChange} />
            <SHorizontalMenu
                mb={4}
                onChange={(value) => setActiveType(value.type)}
                options={riskOptionsList}
                getKeyExtractor={(item) => item.value}
                getLabel={(item) => item.label}
                getIsActive={(item) => item.type === activeType}
            />

            {/* <SFloatingButton
                renderInPortal={false}
                shadow={2}
                placement="bottom-right"
                size="md"
                bg="green.500"
                _pressed={{ bg: 'green.700' }}
                icon={<SIcon color="white" as={MaterialIcons} name="add" size="4" />}
                label="Adicionar"
                bottom={SAFE_AREA_PADDING.paddingBottom}
                onPress={() => handleCreateRisk()}
            /> */}

            {!!risksFiltered?.length && (
                <SFlatList
                    data={results || []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <EnhancedRiskCard risk={item} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ flexGrow: 1, paddingHorizontal: pagePaddingPx }}
                />
            )}
            {!risksFiltered?.length && <SNoContent mx="pagePaddingPx" />}
        </>
    );
}

const enhance = withObservables(['user'], ({ user }) => {
    let risks: any;

    try {
        risks = user.risks;
    } catch (error) {
        risks = undefined;
    }

    return {
        ...(risks && { risks }),
        user,
    };
});

const EnhancedRiskList = enhance(RiskList);

export function RenderEnhancedRiskList({ user }: { user?: UserAuthModel }) {
    try {
        if (user) return <EnhancedRiskList user={user} />;
        return null;
    } catch (e) {
        return null;
    }
}

export default RenderEnhancedRiskList;
