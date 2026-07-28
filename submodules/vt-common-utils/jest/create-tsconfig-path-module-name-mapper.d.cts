export interface CreateTsconfigPathModuleNameMapperOptions {
  workspaceRoot?: string;
  tsconfigPath?: string;
}

export declare function createTsconfigPathModuleNameMapper(
  options?: CreateTsconfigPathModuleNameMapperOptions,
): Record<string, string | string[]>;
