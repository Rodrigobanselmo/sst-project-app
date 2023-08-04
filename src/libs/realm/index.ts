import { createRealmContext } from '@realm/react';

import { CompanyCharacterization } from './schemas/CompanyCharacterization';
import { CompanyCharacterizationPhoto } from './schemas/CompanyCharacterizationPhoto';

const realmAccessBehavior: Realm.OpenRealmBehaviorConfiguration = {
    type: Realm.OpenRealmBehaviorType.OpenImmediately,
};

export const syncConfig: any = {
    flexible: true,
    newRealmFileBehavior: realmAccessBehavior,
    existingRealmFileBehavior: realmAccessBehavior,
};

export const { RealmProvider, useRealm, useQuery, useObject } = createRealmContext({
    schema: [CompanyCharacterizationPhoto, CompanyCharacterization],
    schemaVersion: 1,
});
