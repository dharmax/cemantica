export declare class Session {
    token: string;
    userId: string;
}
/**
 * @return session if true
 */
export declare function isLoggedIn(): Session;
export declare function getSession(reset?: boolean): Promise<any>;
export declare function logout(): Promise<any>;
export declare function signup(details: any, remember: boolean): Promise<Session>;
export declare function finalSignupPhase(emailCode: any, smsCode: any, validationToken: any): Promise<Session>;
export declare function passwordLogin(email: any, password: any, rememberMe?: boolean): Promise<Session>;
export declare function ssoLogin(provider: any, nextUrl: any): void;
export declare function loadSession(sessionToken: any): Promise<Session>;
