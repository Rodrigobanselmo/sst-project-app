import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

/** One durable row per immutable operation (or small base/meta record), never one visit-sized blob. */
export class SyncOperationModel extends Model {
    static table = 'SyncOperation';
    @field('context_key') contextKey!: string;
    @field('record_type') recordType!: string;
    @field('entity_key') entityKey!: string;
    @field('data') data!: string;
}
