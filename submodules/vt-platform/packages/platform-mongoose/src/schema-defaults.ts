/**
 * Explicit marker for schema paths where Mongoose must not synthesize its
 * implicit empty-object/empty-array default.
 *
 * Use this only for writer-owned initial values:
 * `@Prop({ type: [ItemSchema], default: MONGOOSE_NO_DEFAULT })`.
 */
export const MONGOOSE_NO_DEFAULT = undefined;

export type MongooseSchemaPathDefaultReader = {
  path(path: string): { defaultValue?: unknown; options?: { default?: unknown } } | undefined;
};

export function getMongooseSchemaPathDefault(
  schema: MongooseSchemaPathDefaultReader,
  path: string,
): unknown {
  const schemaPath = schema.path(path);
  return schemaPath?.defaultValue ?? schemaPath?.options?.default;
}
