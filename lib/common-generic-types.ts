export interface IReadOptions {
    from: number
    count: number
    entityOnly?: boolean;
    queryName?: string
    queryParams?: Object
    sort?: SortSpec
    projection?: string[]
    requestNumber?: number // created automatically
}

export interface IFriendship {
    follows
    followed
    friend
}
export type SortSpec = { [fieldName: string]: 1 | -1 }

export interface IReadResult {
    error?: string
    items: any[]
    total?: number
    totalFiltered: number
    opts?: IReadOptions
}

export interface IAdjustmentData {
    distance?: number
    startTime?: Date
    endTime?: Date
}

export type SSOProviderName = 'facebook' | 'google'

export interface IClientLogQuery {
    reportRangeStart?: Date
    reportRangeEnd?: Date
    userId?: string
    eventRangeStart?: Date
    eventRangeEnd?: Date
    limit?: number
    group?: string
    text?: string
    justHeaders: boolean
}

export type IClientLogQueryResultEntry = {
    group: string
    userId: string
    userEmail: string
    reportTime: Date
    title: string
    entries: Object[]
}

export interface ISubscriptionOptions {
    getNotifications: boolean
    type?: string
    friend?: boolean
    note?: string
}
