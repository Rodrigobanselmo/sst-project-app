import { formatCNPJ } from '@brazilian-utils/brazilian-utils';
import { SBox, SCenter, SFlatList, SFormControl, SHStack, SSpinner, SText, SVStack } from '@components/core';
import { SButton, SInput, SLoading } from '@components/modelucules';
import { SRowCard } from '@components/modelucules/SRowCard';
import { SModal } from '@components/organisms/SModal';
import { SSearchModal } from '@components/organisms/SSearchModal';
import { SCREEN_HEIGHT } from '@constants/constants';
import { ICompany, IWorkspace } from '@interfaces/ICompany';
import { useQueryCompanies } from '@services/api/company/getCompanies';
import { useQueryCompany } from '@services/api/company/getCompany/useQueryCompany';
import { useQueryWorkspaces } from '@services/api/workspace/getWorkspaces';
import { addDotsText } from '@utils/helpers/addDotsText';
import { useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export const SSearchWorkspace = ({
    showModal,
    setShowModal,
    renderTopItem,
    onSelect,
    companyId,
    handleGoBack,
    isLoading: isLoadingProp,
}: {
    showModal: boolean;
    isLoading?: boolean;
    companyId?: string;
    setShowModal: (open: boolean) => void;
    handleGoBack?: () => void;
    onSelect: (workspace: IWorkspace, workspaces: IWorkspace[]) => Promise<void>;
    renderTopItem?: () => React.ReactElement;
}) => {
    const [search, setSearch] = useState('');
    const {
        data,
        isLoading: loading,
        isError,
    } = useQueryWorkspaces(1, { search, companyId, disabled: !showModal }, 20);

    const handleSelect = async (workspace: IWorkspace) => {
        await onSelect(workspace, data);
        setShowModal(false);
    };

    const isLoading = isLoadingProp || loading;

    return (
        <SSearchModal
            showModal={showModal}
            onShowModal={setShowModal}
            isError={isError}
            handleGoBack={handleGoBack}
            title="Selecionar Estabelecimento"
            data={data}
            renderTopItem={renderTopItem}
            isLoading={isLoading}
            onSearch={setSearch}
            renderItem={({ item }) => (
                <SRowCard disabled={isLoading} onPress={() => handleSelect(item)}>
                    <SVStack space={1}>
                        <SText>{addDotsText({ text: item.name, maxLength: 30 })}</SText>
                        <SText fontSize={11}>{addDotsText({ text: item.description, maxLength: 50 })}</SText>
                    </SVStack>
                </SRowCard>
            )}
        />
    );
};
