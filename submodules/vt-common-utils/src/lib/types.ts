export type IsoDateString = string & { readonly __brand: 'IsoDateString' };
export type UuidString = string & { readonly __brand: 'UuidString' };

export type ExtensiblePartial<TInitial extends object, TInput extends object = object> =
  TInput & Partial<TInitial>;

export type WithInitialValues<TInput extends object, TInitial extends object> =
  Omit<TInput, keyof TInitial> & TInitial;

export type InitialValueDefaults<TInitial extends object> = {
  readonly [K in keyof TInitial]: TInitial[K] extends readonly (infer TItem)[]
    ? readonly TItem[]
    : TInitial[K] extends object
      ? Readonly<TInitial[K]>
      : TInitial[K];
};
