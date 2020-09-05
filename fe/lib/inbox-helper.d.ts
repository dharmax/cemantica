export declare function displayableHeader(n: {
    related: any;
    eventName: any;
}): string;
interface IRelated {
    link?: string;
    label: any;
    entityType: any;
    entityId: any;
    role: any;
    index?: any;
}
export declare function mapRelated(array: IRelated[]): {
    [role: string]: IRelated;
};
export {};
