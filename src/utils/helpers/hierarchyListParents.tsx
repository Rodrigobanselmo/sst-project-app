import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { IHierarchy } from '@interfaces/IHierarchy';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';

export type HierarchyListParents = IHierarchy & { parents: IHierarchy[] };
export type HierarchyListWithTypes = {
    hierarchies: HierarchyListParents[];
    types: HierarchyEnum[];
};

export const hierarchyListParents = (hierarchies: IHierarchy[]): HierarchyListWithTypes => {
    const hierarchyTree: Record<string, IHierarchy> = {};
    const types: Set<HierarchyEnum> = new Set();

    hierarchies.forEach((node) => {
        hierarchyTree[node.id] = node;
        types.add(node.type);
    });

    const hierarchyArray: HierarchyListParents[] = hierarchies.map((hierarchy) => {
        const parent = hierarchy?.parentId ? hierarchyTree[hierarchy?.parentId] : { parentId: null };

        const parent2 = parent?.parentId ? hierarchyTree[parent?.parentId] : { parentId: null };

        const parent3 = parent2?.parentId ? hierarchyTree[parent2?.parentId] : { parentId: null };

        const parent4 = parent3?.parentId ? hierarchyTree[parent3?.parentId] : { parentId: null };

        const parent5 = parent4?.parentId ? hierarchyTree[parent4?.parentId] : { parentId: null };

        const parent6 = parent5?.parentId ? hierarchyTree[parent5?.parentId] : { parentId: null };

        const parents = [parent6, parent5, parent4, parent3, parent2, parent]
            .map((parent) =>
                parent && 'name' in parent
                    ? {
                          id: hierarchy.id,
                          name: parent.name,
                          type: parent.type,
                      }
                    : '',
            )
            .filter((i) => i) as HierarchyListParents[];

        return {
            companyId: hierarchy.companyId,
            id: hierarchy.id,
            name: hierarchy.name,
            parentId: hierarchy.parentId,
            type: hierarchy.type,
            parents,
        };
    });

    return { hierarchies: hierarchyArray, types: Array.from(types.values()) };
};
