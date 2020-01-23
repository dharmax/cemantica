export enum WhisperationStatus { featured, approved, flagged, banned, new}

export enum FeaturingRole { competition, special, editor, daily, weekly, monthly}

export enum PieceListingType {general, subscriptions, SEO}

export interface IRatable {
    averageScore: number
    ratingCount: number
}

export interface IWhisperation extends IRatable {

    status: WhisperationStatus
    featuringAs: FeaturingRole
    flags: number
    lastUsed: Date

    items: string[]

    comment: string

}

export enum PieceType { story, poem, article}

export enum PieceStatus {
    hidden, private, limited, draft, published, banned
}


export interface IPiece extends IRatable {
    text: string
    type: PieceType
    title: string
    edited: Date
    language: string
    flags: number
    adultOnly: boolean
    status: string
    writer?
}