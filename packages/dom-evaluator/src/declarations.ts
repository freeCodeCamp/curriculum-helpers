declare module "enzyme" {
  interface ConfigureOptions {
    adapter: object;
  }

  export function configure(options: ConfigureOptions): void;
}

declare module "enzyme-adapter-react-16" {
  class Adapter {
    constructor();
  }

  export default Adapter;
}
