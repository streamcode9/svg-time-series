export interface Scale<Domain> {
  (value: Domain): number;
  ticks?: (count?: number) => ReadonlyArray<Domain>;
  tickFormat?: (count?: number, specifier?: string) => (d: any) => string;
  bandwidth?: () => number;
  domain: () => ReadonlyArray<Domain>;
  copy: () => Scale<Domain>;
}
