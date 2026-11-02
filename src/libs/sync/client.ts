import { api } from '@services/api';
import { getFormFileFromURI } from '@utils/helpers/getAssetInfo';
import { SyncJournal } from './journal';
import { SyncClient, SyncReceipt } from './types';
import { storageUserGet } from '@libs/storage/disk/user';
import { storageAuthTokenGet } from '@libs/storage/disk/token';

export function createSyncClient(journal: SyncJournal): SyncClient {
    const path = `/companies/${journal.context.companyId}/mobile-sync`;
    const headers = async () => {
        const assertActor = async () => {
            const actor = await storageUserGet();
            if (!actor || Number(actor.id) !== journal.context.userId) {
                throw Object.assign(new Error('A sessão mudou. Entre novamente com o usuário desta coleta para continuar. Os dados permanecem no aparelho.'),
                    { code: 'AUTH_SESSION_CHANGED', status: 401 });
            }
        };
        await assertActor();
        const token = await storageAuthTokenGet();
        await assertActor();
        if (!token?.token) throw Object.assign(new Error('Entre novamente para sincronizar. Os dados permanecem no aparelho.'), { code: 'AUTH_EXPIRED', status: 401 });
        return { Authorization: `Bearer ${token.token}` };
    };
    return {
        async send(operations, context, options) {
            const response = await api.post(`${path}/operations`, { contractVersion: 1,
                deviceId: context.deviceId, workspaceId: context.workspaceId, operations,
                ...(options?.deferApplication ? { deferApplication: true } : {}) }, { timeout: 30000, headers: await headers() });
            return response.data;
        },
        async receipts(context) {
            const receipts = new Map<string, SyncReceipt>();
            let after: string | undefined; let attachmentsAfter: string | undefined;
            for (let page = 0; page < 500; page += 1) {
                const response = await api.get(`${path}/operations`, { params: {
                    deviceId: context.deviceId, workspaceId: context.workspaceId, after, attachmentsAfter }, timeout: 30000, headers: await headers() });
                for (const receipt of [...(response.data.operations || []), ...(response.data.attachments || [])]) receipts.set(receipt.operationId, receipt);
                after = response.data.nextCursor || response.data.operations?.at(-1)?.operationId || after;
                attachmentsAfter = response.data.nextAttachmentsCursor || response.data.attachments?.at(-1)?.operationId || attachmentsAfter;
                if (!response.data.nextCursor && !response.data.nextAttachmentsCursor) return { operations: Array.from(receipts.values()) };
            }
            throw new Error('A consulta das confirmações não terminou. Os dados continuam preservados.');
        },
        async upload(operation, context) {
            const current = (await journal.read()).entries.find((e) => e.operation.operationId === operation.operationId);
            if (current?.receipt.durable) {
                const response = await api.post(`${path}/attachments/${operation.operationId}/apply`, {
                    contractVersion: 1, deviceId: context.deviceId, workspaceId: context.workspaceId,
                }, { timeout: 30000, headers: await headers() });
                return response.data as SyncReceipt;
            }
            const file = await getFormFileFromURI(operation.payload.uri);
            if (!file) throw new Error('O arquivo não foi encontrado neste aparelho. As informações da coleta foram preservadas e os demais itens continuam sendo enviados.');
            const form = new FormData();
            for (const [key, value] of Object.entries({ contractVersion: '1', deviceId: context.deviceId,
                workspaceId: context.workspaceId, operationId: operation.operationId, entityId: operation.entityId,
                characterizationId: operation.payload.characterizationId, kind: operation.kind, name: operation.payload.name })) {
                if (value !== undefined) form.append(key, String(value));
            }
            form.append('file', file as any);
            const response = await api.post(`${path}/attachments`, form, { timeout: 120000,
                headers: { ...await headers(), 'Content-Type': 'multipart/form-data' } });
            return response.data as SyncReceipt;
        },
    };
}
