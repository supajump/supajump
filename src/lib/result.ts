export type Result<T, E = Error> =
  | { data: T; error: null }
  | { data: null; error: E };

export const ok = <T>(data: T): Result<T, never> => ({ data, error: null });
export const err = <E>(error: E): Result<never, E> => ({ data: null, error });
