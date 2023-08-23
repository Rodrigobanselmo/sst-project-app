import { formatCNPJ } from '@brazilian-utils/brazilian-utils';
import { SBox, SCenter, SFlatList, SFormControl, SHStack, SSpinner, SText, SVStack } from '@components/core';
import { SButton, SInput, SLoading } from '@components/modelucules';
import { SRowCard } from '@components/modelucules/SRowCard';
import { SModal } from '@components/organisms/SModal';
import { SSearchModal } from '@components/organisms/SSearchModal';
import { SCREEN_HEIGHT } from '@constants/constants';
import { ICompany } from '@interfaces/ICompany';
import { useQueryCompanies } from '@services/api/company/getCompanies';
import { addDotsText } from '@utils/helpers/addDotsText';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export const SSearchCompany = ({
    showModal,
    setShowModal,
    renderTopItem,
    onSelect,
    isLoading: isLoadingComponent,
}: {
    showModal: boolean;
    setShowModal: (open: boolean) => void;
    onSelect: (company: ICompany) => void;
    isLoading?: boolean;
    renderTopItem?: () => React.ReactElement;
}) => {
    const [search, setSearch] = useState('');
    const { companies, isLoading, isError } = useQueryCompanies(1, { search }, 20);

    const handlePress = (company: ICompany) => {
        onSelect(company);
    };

    return (
        <SSearchModal
            showModal={showModal}
            onShowModal={setShowModal}
            isError={isError}
            title="Selecionar Empresa"
            data={companies}
            renderTopItem={renderTopItem}
            isLoading={isLoading || isLoadingComponent}
            onSearch={setSearch}
            renderItem={({ item }) => (
                <SRowCard disabled={isLoadingComponent} onPress={() => handlePress(item)}>
                    <SVStack space={1}>
                        <SText>{addDotsText({ text: item.name, maxLength: 30 })}</SText>
                        <SText fontSize={11}>
                            {addDotsText({ text: item.fantasy, maxLength: 25 })} &nbsp;&nbsp; CNPJ:{' '}
                            {formatCNPJ(item.cnpj)}
                        </SText>
                    </SVStack>
                </SRowCard>
            )}
        />
    );
};
