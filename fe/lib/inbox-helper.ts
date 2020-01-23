export function displayableHeader(n: { related, eventName }) {
    const mapped = mapRelated(n.related)

    const relatedCopy = n.related.slice()

    const subject = mapped.subject
    const by = mapped.by


    return `${subject.label} ${n.eventName} by ${by.label}`
}


interface IRelated {
    link?: string;
    label
    entityType
    entityId
    role
    index?
}

export function mapRelated(array: IRelated[]): { [role: string]: IRelated } {

    return array.reduce((a, c, i) => {
        a[c.role] = c
        c.index = i
        c.label = c.label || c.entityType
        c.link = c.entityType.toLowerCase() + '/' + c.entityId
        return a
    }, {})

}