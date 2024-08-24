declare module "assert" {
  function assert(value: any, message?: string): void;

  namespace assert {
    export function ok(value: any, message?: string): void;
  }

  export = assert;
}
