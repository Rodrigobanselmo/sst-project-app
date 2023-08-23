import { SFlatList } from '@components/core';
import { WorkspaceModel } from '@libs/watermelon/model/WorkspaceModel';
import withObservables from '@nozbe/with-observables';
import EnhancedWorkspaceEnviromentCard from './WorkspaceEnviromentCard';

type Props = {
    workspaces: WorkspaceModel[];
};

export function WorkspaceEnviromentList({ workspaces }: Props): React.ReactElement {
    return (
        <SFlatList
            data={workspaces}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <EnhancedWorkspaceEnviromentCard characterization={item} />}
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
