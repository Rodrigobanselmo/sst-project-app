import { HierarchyEnum } from '@constants/enums/hierarchy.enum';
import { IHierarchy } from '@interfaces/IHierarchy';
import { HierarchyModel } from '@libs/watermelon/model/HierarchyModel';

export type HierarchyListParents = IHierarchy & { parentsName: string[] };
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

        const parentsName = [parent6, parent5, parent4, parent3, parent2, parent]
            .map((parent) => (parent && 'name' in parent && parent?.parentId ? parent.name : ''))
            .filter((i) => i);

        return {
            ...hierarchy,
            parentsName: parentsName,
        };
    });

    return { hierarchies: hierarchyArray, types: Array.from(types.values()) };
};
