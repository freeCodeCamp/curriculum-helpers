
interface optionsProp {
    first: any;
    language: string;
    line: boolean;
    safe: boolean;
    keepProtected: boolean;
    block: boolean;
    preserveNewlines: boolean;
}

export type options = optionsProp | Record<string, string>;
