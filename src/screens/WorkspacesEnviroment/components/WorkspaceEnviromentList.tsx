import { SFlatList } from '@components/core';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import { withObservables } from '@nozbe/watermelondb/react';
import EnhancedWorkspaceEnviromentCard from './WorkspaceEnviromentCard';
import { SNoContent } from '@components/modelucules';

type Props = {
    workspaces: WorkspaceModel[];
};

export function WorkspaceEnviromentList({ workspaces }: Props): React.ReactElement {
    if (!workspaces.length) {
        return <SNoContent mx="pagePaddingPx" />;
    }

    return (
        <SFlatList
            data={workspaces}
            // keyboardShouldPersistTaps={'handled'}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <EnhancedWorkspaceEnviromentCard workspace={item} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 8 }}
        />
    );
}

const enhance = withObservables(['user'], ({ user }) => {
    return { workspaces: user.workspacesEnviroments };
});

const EnhancedWorkspaceEnviromentList = enhance(WorkspaceEnviromentList);
export default EnhancedWorkspaceEnviromentList;
