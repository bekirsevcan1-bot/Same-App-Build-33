export * from "./generated/api";
export * from "./generated/types";
// Explicit re-exports resolve the value/type name collision between the
// generated zod schemas (api) and the generated TS types (types).
export { UpdateRequestStatusBody, UpdateUstaStatusBody } from "./generated/api";
export type {
  UpdateRequestStatusBody as UpdateRequestStatusBodyDto,
  UpdateUstaStatusBody as UpdateUstaStatusBodyDto,
} from "./generated/types";
