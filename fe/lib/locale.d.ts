export declare type Language = 'he' | 'en' | 'fr' | 'ar' | 'sp';
export declare function localize(orgString: string): string;
/**
 * Note that this function is good just for static stuff. Otherwise, do it dynamically (in JS)
 * @param root starting point to check
 */
export declare function localizeTags(root?: Element): void;
export declare function setLanguage(locale: Language): void;
