import { createCollection, localStorageCollectionOptions } from '@tanstack/db';
import { z } from 'zod';

/**
 * Settings schema matching Config type
 */
const settingsSchema = z.object({
  id: z.string().default('settings'),
  scopeDelim: z.string().default('/'),
  scopeEnabled: z.boolean().default(true),
});

export type Settings = z.infer<typeof settingsSchema>;

/**
 * Settings collection - persisted to localStorage
 */
export const settingsCollection = createCollection(
  localStorageCollectionOptions({
    id: 'settings',
    schema: settingsSchema,
    getKey: (item) => item.id,
  })
);

// Initialize with defaults if empty
if (settingsCollection.state.data.size === 0) {
  settingsCollection.insert({ id: 'settings', scopeDelim: '/', scopeEnabled: true });
}
