import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AuthResponse, BulkQuestionInput, Chapter, ChapterInput, ChapterUpdate, Class, ClassInput, ClassUpdate, DashboardStats, ForgotPasswordInput, HealthStatus, ListChaptersParams, ListClassesParams, ListQuestionsParams, ListSectionsParams, ListSubjectsParams, LoginInput, Question, QuestionInput, QuestionPage, QuestionUpdate, RecentQuestion, RefreshInput, RegisterInput, ResetPasswordInput, SearchQuestionsParams, Section, SectionInput, SectionUpdate, Session, Subject, SubjectInput, SubjectUpdate, Test, TestConfig, TestResult, TestSubmission, TestSummary, TotpCodeInput, TotpConfirmResponse, TotpEnrollResponse, TotpVerifyInput, User, UserRoleUpdate, VerifyEmailInput } from './api.schemas';
import { customFetch } from '../custom-fetch';
import type { ErrorType, BodyType } from '../custom-fetch';
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
export declare const getHealthCheckUrl: () => string;
/**
 * @summary Health check
 */
export declare const healthCheck: (options?: Parameters<typeof customFetch>[1]) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getRegisterUrl: () => string;
/**
 * @summary Register a new user
 */
export declare const register: (registerInput: RegisterInput, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getRegisterMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
        data: BodyType<RegisterInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
    data: BodyType<RegisterInput>;
}, TContext>;
export type RegisterMutationResult = NonNullable<Awaited<ReturnType<typeof register>>>;
export type RegisterMutationBody = BodyType<RegisterInput>;
export type RegisterMutationError = ErrorType<void>;
/**
* @summary Register a new user
*/
export declare const useRegister: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof register>>, TError, {
        data: BodyType<RegisterInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof register>>, TError, {
    data: BodyType<RegisterInput>;
}, TContext>;
export declare const getLoginUrl: () => string;
/**
 * @summary Login
 */
export declare const login: (loginInput: LoginInput, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getLoginMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginInput>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<LoginInput>;
export type LoginMutationError = ErrorType<void>;
/**
* @summary Login
*/
export declare const useLogin: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<LoginInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<LoginInput>;
}, TContext>;
export declare const getGetMeUrl: () => string;
/**
 * @summary Get current user
 */
export declare const getMe: (options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getGetMeQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetMeQueryOptions: <TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetMeQueryResult = NonNullable<Awaited<ReturnType<typeof getMe>>>;
export type GetMeQueryError = ErrorType<void>;
/**
 * @summary Get current user
 */
export declare function useGetMe<TData = Awaited<ReturnType<typeof getMe>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getMe>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getLogoutUrl: () => string;
/**
 * @summary Logout
 */
export declare const logout: (options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getLogoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export type LogoutMutationResult = NonNullable<Awaited<ReturnType<typeof logout>>>;
export type LogoutMutationError = ErrorType<unknown>;
/**
* @summary Logout
*/
export declare const useLogout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export declare const getForgotPasswordUrl: () => string;
/**
 * @summary Request password reset email
 */
export declare const forgotPassword: (forgotPasswordInput: ForgotPasswordInput, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getForgotPasswordMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof forgotPassword>>, TError, {
        data: BodyType<ForgotPasswordInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof forgotPassword>>, TError, {
    data: BodyType<ForgotPasswordInput>;
}, TContext>;
export type ForgotPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof forgotPassword>>>;
export type ForgotPasswordMutationBody = BodyType<ForgotPasswordInput>;
export type ForgotPasswordMutationError = ErrorType<unknown>;
/**
* @summary Request password reset email
*/
export declare const useForgotPassword: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof forgotPassword>>, TError, {
        data: BodyType<ForgotPasswordInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof forgotPassword>>, TError, {
    data: BodyType<ForgotPasswordInput>;
}, TContext>;
export declare const getResetPasswordUrl: () => string;
/**
 * @summary Reset password using token
 */
export declare const resetPassword: (resetPasswordInput: ResetPasswordInput, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getResetPasswordMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
        data: BodyType<ResetPasswordInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
    data: BodyType<ResetPasswordInput>;
}, TContext>;
export type ResetPasswordMutationResult = NonNullable<Awaited<ReturnType<typeof resetPassword>>>;
export type ResetPasswordMutationBody = BodyType<ResetPasswordInput>;
export type ResetPasswordMutationError = ErrorType<void>;
/**
* @summary Reset password using token
*/
export declare const useResetPassword: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof resetPassword>>, TError, {
        data: BodyType<ResetPasswordInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof resetPassword>>, TError, {
    data: BodyType<ResetPasswordInput>;
}, TContext>;
export declare const getRequestEmailVerificationUrl: () => string;
/**
 * @summary Request email verification link
 */
export declare const requestEmailVerification: (options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getRequestEmailVerificationMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestEmailVerification>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof requestEmailVerification>>, TError, void, TContext>;
export type RequestEmailVerificationMutationResult = NonNullable<Awaited<ReturnType<typeof requestEmailVerification>>>;
export type RequestEmailVerificationMutationError = ErrorType<void>;
/**
* @summary Request email verification link
*/
export declare const useRequestEmailVerification: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof requestEmailVerification>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof requestEmailVerification>>, TError, void, TContext>;
export declare const getVerifyEmailUrl: () => string;
/**
 * @summary Verify email using token
 */
export declare const verifyEmail: (verifyEmailInput: VerifyEmailInput, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getVerifyEmailMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyEmail>>, TError, {
        data: BodyType<VerifyEmailInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyEmail>>, TError, {
    data: BodyType<VerifyEmailInput>;
}, TContext>;
export type VerifyEmailMutationResult = NonNullable<Awaited<ReturnType<typeof verifyEmail>>>;
export type VerifyEmailMutationBody = BodyType<VerifyEmailInput>;
export type VerifyEmailMutationError = ErrorType<void>;
/**
* @summary Verify email using token
*/
export declare const useVerifyEmail: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyEmail>>, TError, {
        data: BodyType<VerifyEmailInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyEmail>>, TError, {
    data: BodyType<VerifyEmailInput>;
}, TContext>;
export declare const getEnroll2faUrl: () => string;
/**
 * @summary Begin 2FA enrollment — returns provisioning URI and QR code
 */
export declare const enroll2fa: (options?: Parameters<typeof customFetch>[1]) => Promise<TotpEnrollResponse>;
export declare const getEnroll2faMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof enroll2fa>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof enroll2fa>>, TError, void, TContext>;
export type Enroll2faMutationResult = NonNullable<Awaited<ReturnType<typeof enroll2fa>>>;
export type Enroll2faMutationError = ErrorType<void>;
/**
* @summary Begin 2FA enrollment — returns provisioning URI and QR code
*/
export declare const useEnroll2fa: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof enroll2fa>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof enroll2fa>>, TError, void, TContext>;
export declare const getConfirm2faUrl: () => string;
/**
 * @summary Confirm 2FA enrollment using first TOTP code
 */
export declare const confirm2fa: (totpCodeInput: TotpCodeInput, options?: Parameters<typeof customFetch>[1]) => Promise<TotpConfirmResponse>;
export declare const getConfirm2faMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof confirm2fa>>, TError, {
        data: BodyType<TotpCodeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof confirm2fa>>, TError, {
    data: BodyType<TotpCodeInput>;
}, TContext>;
export type Confirm2faMutationResult = NonNullable<Awaited<ReturnType<typeof confirm2fa>>>;
export type Confirm2faMutationBody = BodyType<TotpCodeInput>;
export type Confirm2faMutationError = ErrorType<void>;
/**
* @summary Confirm 2FA enrollment using first TOTP code
*/
export declare const useConfirm2fa: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof confirm2fa>>, TError, {
        data: BodyType<TotpCodeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof confirm2fa>>, TError, {
    data: BodyType<TotpCodeInput>;
}, TContext>;
export declare const getVerify2faUrl: () => string;
/**
 * @summary Verify TOTP code during login (step 2)
 */
export declare const verify2fa: (totpVerifyInput: TotpVerifyInput, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getVerify2faMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verify2fa>>, TError, {
        data: BodyType<TotpVerifyInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verify2fa>>, TError, {
    data: BodyType<TotpVerifyInput>;
}, TContext>;
export type Verify2faMutationResult = NonNullable<Awaited<ReturnType<typeof verify2fa>>>;
export type Verify2faMutationBody = BodyType<TotpVerifyInput>;
export type Verify2faMutationError = ErrorType<void>;
/**
* @summary Verify TOTP code during login (step 2)
*/
export declare const useVerify2fa: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verify2fa>>, TError, {
        data: BodyType<TotpVerifyInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verify2fa>>, TError, {
    data: BodyType<TotpVerifyInput>;
}, TContext>;
export declare const getDisable2faUrl: () => string;
/**
 * @summary Disable 2FA
 */
export declare const disable2fa: (totpCodeInput: TotpCodeInput, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDisable2faMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof disable2fa>>, TError, {
        data: BodyType<TotpCodeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof disable2fa>>, TError, {
    data: BodyType<TotpCodeInput>;
}, TContext>;
export type Disable2faMutationResult = NonNullable<Awaited<ReturnType<typeof disable2fa>>>;
export type Disable2faMutationBody = BodyType<TotpCodeInput>;
export type Disable2faMutationError = ErrorType<void>;
/**
* @summary Disable 2FA
*/
export declare const useDisable2fa: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof disable2fa>>, TError, {
        data: BodyType<TotpCodeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof disable2fa>>, TError, {
    data: BodyType<TotpCodeInput>;
}, TContext>;
export declare const getRefreshSessionUrl: () => string;
/**
 * @summary Refresh access token using refresh token
 */
export declare const refreshSession: (refreshInput: RefreshInput, options?: Parameters<typeof customFetch>[1]) => Promise<AuthResponse>;
export declare const getRefreshSessionMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof refreshSession>>, TError, {
        data: BodyType<RefreshInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof refreshSession>>, TError, {
    data: BodyType<RefreshInput>;
}, TContext>;
export type RefreshSessionMutationResult = NonNullable<Awaited<ReturnType<typeof refreshSession>>>;
export type RefreshSessionMutationBody = BodyType<RefreshInput>;
export type RefreshSessionMutationError = ErrorType<void>;
/**
* @summary Refresh access token using refresh token
*/
export declare const useRefreshSession: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof refreshSession>>, TError, {
        data: BodyType<RefreshInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof refreshSession>>, TError, {
    data: BodyType<RefreshInput>;
}, TContext>;
export declare const getListSessionsUrl: () => string;
/**
 * @summary List active sessions for current user
 */
export declare const listSessions: (options?: Parameters<typeof customFetch>[1]) => Promise<Session[]>;
export declare const getListSessionsQueryKey: () => readonly ["/api/auth/sessions"];
export declare const getListSessionsQueryOptions: <TData = Awaited<ReturnType<typeof listSessions>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSessionsQueryResult = NonNullable<Awaited<ReturnType<typeof listSessions>>>;
export type ListSessionsQueryError = ErrorType<void>;
/**
 * @summary List active sessions for current user
 */
export declare function useListSessions<TData = Awaited<ReturnType<typeof listSessions>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getRevokeAllSessionsUrl: () => string;
/**
 * @summary Revoke all other sessions
 */
export declare const revokeAllSessions: (options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getRevokeAllSessionsMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof revokeAllSessions>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof revokeAllSessions>>, TError, void, TContext>;
export type RevokeAllSessionsMutationResult = NonNullable<Awaited<ReturnType<typeof revokeAllSessions>>>;
export type RevokeAllSessionsMutationError = ErrorType<void>;
/**
* @summary Revoke all other sessions
*/
export declare const useRevokeAllSessions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof revokeAllSessions>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof revokeAllSessions>>, TError, void, TContext>;
export declare const getRevokeSessionUrl: (sessionId: number) => string;
/**
 * @summary Revoke a specific session
 */
export declare const revokeSession: (sessionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getRevokeSessionMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof revokeSession>>, TError, {
        sessionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof revokeSession>>, TError, {
    sessionId: number;
}, TContext>;
export type RevokeSessionMutationResult = NonNullable<Awaited<ReturnType<typeof revokeSession>>>;
export type RevokeSessionMutationError = ErrorType<void>;
/**
* @summary Revoke a specific session
*/
export declare const useRevokeSession: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof revokeSession>>, TError, {
        sessionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof revokeSession>>, TError, {
    sessionId: number;
}, TContext>;
export declare const getListUsersUrl: () => string;
/**
 * @summary List all users (admin only)
 */
export declare const listUsers: (options?: Parameters<typeof customFetch>[1]) => Promise<User[]>;
export declare const getListUsersQueryKey: () => readonly ["/api/auth/users"];
export declare const getListUsersQueryOptions: <TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListUsersQueryResult = NonNullable<Awaited<ReturnType<typeof listUsers>>>;
export type ListUsersQueryError = ErrorType<unknown>;
/**
 * @summary List all users (admin only)
 */
export declare function useListUsers<TData = Awaited<ReturnType<typeof listUsers>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listUsers>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateUserRoleUrl: (userId: number) => string;
/**
 * @summary Update user role (admin only)
 */
export declare const updateUserRole: (userId: number, userRoleUpdate: UserRoleUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<User>;
export declare const getUpdateUserRoleMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserRole>>, TError, {
        userId: number;
        data: BodyType<UserRoleUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateUserRole>>, TError, {
    userId: number;
    data: BodyType<UserRoleUpdate>;
}, TContext>;
export type UpdateUserRoleMutationResult = NonNullable<Awaited<ReturnType<typeof updateUserRole>>>;
export type UpdateUserRoleMutationBody = BodyType<UserRoleUpdate>;
export type UpdateUserRoleMutationError = ErrorType<unknown>;
/**
* @summary Update user role (admin only)
*/
export declare const useUpdateUserRole: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateUserRole>>, TError, {
        userId: number;
        data: BodyType<UserRoleUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateUserRole>>, TError, {
    userId: number;
    data: BodyType<UserRoleUpdate>;
}, TContext>;
export declare const getGetDashboardStatsUrl: () => string;
/**
 * @summary Get dashboard statistics
 */
export declare const getDashboardStats: (options?: Parameters<typeof customFetch>[1]) => Promise<DashboardStats>;
export declare const getGetDashboardStatsQueryKey: () => readonly ["/api/dashboard/stats"];
export declare const getGetDashboardStatsQueryOptions: <TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDashboardStatsQueryResult = NonNullable<Awaited<ReturnType<typeof getDashboardStats>>>;
export type GetDashboardStatsQueryError = ErrorType<unknown>;
/**
 * @summary Get dashboard statistics
 */
export declare function useGetDashboardStats<TData = Awaited<ReturnType<typeof getDashboardStats>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDashboardStats>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetRecentQuestionsUrl: () => string;
/**
 * @summary Get recently added questions
 */
export declare const getRecentQuestions: (options?: Parameters<typeof customFetch>[1]) => Promise<RecentQuestion[]>;
export declare const getGetRecentQuestionsQueryKey: () => readonly ["/api/dashboard/recent-questions"];
export declare const getGetRecentQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof getRecentQuestions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getRecentQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetRecentQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof getRecentQuestions>>>;
export type GetRecentQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary Get recently added questions
 */
export declare function useGetRecentQuestions<TData = Awaited<ReturnType<typeof getRecentQuestions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getRecentQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListClassesUrl: (params?: ListClassesParams) => string;
/**
 * @summary List all classes
 */
export declare const listClasses: (params?: ListClassesParams, options?: Parameters<typeof customFetch>[1]) => Promise<Class[]>;
export declare const getListClassesQueryKey: (params?: ListClassesParams) => readonly ["/api/classes", ...ListClassesParams[]];
export declare const getListClassesQueryOptions: <TData = Awaited<ReturnType<typeof listClasses>>, TError = ErrorType<unknown>>(params?: ListClassesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListClassesQueryResult = NonNullable<Awaited<ReturnType<typeof listClasses>>>;
export type ListClassesQueryError = ErrorType<unknown>;
/**
 * @summary List all classes
 */
export declare function useListClasses<TData = Awaited<ReturnType<typeof listClasses>>, TError = ErrorType<unknown>>(params?: ListClassesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listClasses>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateClassUrl: () => string;
/**
 * @summary Create a class
 */
export declare const createClass: (classInput: ClassInput, options?: Parameters<typeof customFetch>[1]) => Promise<Class>;
export declare const getCreateClassMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createClass>>, TError, {
        data: BodyType<ClassInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createClass>>, TError, {
    data: BodyType<ClassInput>;
}, TContext>;
export type CreateClassMutationResult = NonNullable<Awaited<ReturnType<typeof createClass>>>;
export type CreateClassMutationBody = BodyType<ClassInput>;
export type CreateClassMutationError = ErrorType<unknown>;
/**
* @summary Create a class
*/
export declare const useCreateClass: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createClass>>, TError, {
        data: BodyType<ClassInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createClass>>, TError, {
    data: BodyType<ClassInput>;
}, TContext>;
export declare const getGetClassUrl: (classId: number) => string;
/**
 * @summary Get a class
 */
export declare const getClass: (classId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Class>;
export declare const getGetClassQueryKey: (classId: number) => readonly [`/api/classes/${number}`];
export declare const getGetClassQueryOptions: <TData = Awaited<ReturnType<typeof getClass>>, TError = ErrorType<unknown>>(classId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getClass>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getClass>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetClassQueryResult = NonNullable<Awaited<ReturnType<typeof getClass>>>;
export type GetClassQueryError = ErrorType<unknown>;
/**
 * @summary Get a class
 */
export declare function useGetClass<TData = Awaited<ReturnType<typeof getClass>>, TError = ErrorType<unknown>>(classId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getClass>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateClassUrl: (classId: number) => string;
/**
 * @summary Update a class
 */
export declare const updateClass: (classId: number, classUpdate: ClassUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<Class>;
export declare const getUpdateClassMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateClass>>, TError, {
        classId: number;
        data: BodyType<ClassUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateClass>>, TError, {
    classId: number;
    data: BodyType<ClassUpdate>;
}, TContext>;
export type UpdateClassMutationResult = NonNullable<Awaited<ReturnType<typeof updateClass>>>;
export type UpdateClassMutationBody = BodyType<ClassUpdate>;
export type UpdateClassMutationError = ErrorType<unknown>;
/**
* @summary Update a class
*/
export declare const useUpdateClass: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateClass>>, TError, {
        classId: number;
        data: BodyType<ClassUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateClass>>, TError, {
    classId: number;
    data: BodyType<ClassUpdate>;
}, TContext>;
export declare const getArchiveClassUrl: (classId: number) => string;
/**
 * @summary Archive a class
 */
export declare const archiveClass: (classId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Class>;
export declare const getArchiveClassMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveClass>>, TError, {
        classId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof archiveClass>>, TError, {
    classId: number;
}, TContext>;
export type ArchiveClassMutationResult = NonNullable<Awaited<ReturnType<typeof archiveClass>>>;
export type ArchiveClassMutationError = ErrorType<unknown>;
/**
* @summary Archive a class
*/
export declare const useArchiveClass: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveClass>>, TError, {
        classId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof archiveClass>>, TError, {
    classId: number;
}, TContext>;
export declare const getListSubjectsUrl: (params: ListSubjectsParams) => string;
/**
 * @summary List subjects for a class
 */
export declare const listSubjects: (params: ListSubjectsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Subject[]>;
export declare const getListSubjectsQueryKey: (params?: ListSubjectsParams) => readonly ["/api/subjects", ...ListSubjectsParams[]];
export declare const getListSubjectsQueryOptions: <TData = Awaited<ReturnType<typeof listSubjects>>, TError = ErrorType<unknown>>(params: ListSubjectsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubjects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSubjects>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSubjectsQueryResult = NonNullable<Awaited<ReturnType<typeof listSubjects>>>;
export type ListSubjectsQueryError = ErrorType<unknown>;
/**
 * @summary List subjects for a class
 */
export declare function useListSubjects<TData = Awaited<ReturnType<typeof listSubjects>>, TError = ErrorType<unknown>>(params: ListSubjectsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubjects>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSubjectUrl: (classId: number) => string;
/**
 * @summary Create a subject
 */
export declare const createSubject: (classId: number, subjectInput: SubjectInput, options?: Parameters<typeof customFetch>[1]) => Promise<Subject>;
export declare const getCreateSubjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubject>>, TError, {
        classId: number;
        data: BodyType<SubjectInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSubject>>, TError, {
    classId: number;
    data: BodyType<SubjectInput>;
}, TContext>;
export type CreateSubjectMutationResult = NonNullable<Awaited<ReturnType<typeof createSubject>>>;
export type CreateSubjectMutationBody = BodyType<SubjectInput>;
export type CreateSubjectMutationError = ErrorType<unknown>;
/**
* @summary Create a subject
*/
export declare const useCreateSubject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSubject>>, TError, {
        classId: number;
        data: BodyType<SubjectInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSubject>>, TError, {
    classId: number;
    data: BodyType<SubjectInput>;
}, TContext>;
export declare const getGetSubjectUrl: (subjectId: number) => string;
/**
 * @summary Get a subject
 */
export declare const getSubject: (subjectId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Subject>;
export declare const getGetSubjectQueryKey: (subjectId: number) => readonly [`/api/subjects/${number}`];
export declare const getGetSubjectQueryOptions: <TData = Awaited<ReturnType<typeof getSubject>>, TError = ErrorType<unknown>>(subjectId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSubject>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSubjectQueryResult = NonNullable<Awaited<ReturnType<typeof getSubject>>>;
export type GetSubjectQueryError = ErrorType<unknown>;
/**
 * @summary Get a subject
 */
export declare function useGetSubject<TData = Awaited<ReturnType<typeof getSubject>>, TError = ErrorType<unknown>>(subjectId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSubject>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateSubjectUrl: (subjectId: number) => string;
/**
 * @summary Update a subject
 */
export declare const updateSubject: (subjectId: number, subjectUpdate: SubjectUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<Subject>;
export declare const getUpdateSubjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSubject>>, TError, {
        subjectId: number;
        data: BodyType<SubjectUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSubject>>, TError, {
    subjectId: number;
    data: BodyType<SubjectUpdate>;
}, TContext>;
export type UpdateSubjectMutationResult = NonNullable<Awaited<ReturnType<typeof updateSubject>>>;
export type UpdateSubjectMutationBody = BodyType<SubjectUpdate>;
export type UpdateSubjectMutationError = ErrorType<unknown>;
/**
* @summary Update a subject
*/
export declare const useUpdateSubject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSubject>>, TError, {
        subjectId: number;
        data: BodyType<SubjectUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSubject>>, TError, {
    subjectId: number;
    data: BodyType<SubjectUpdate>;
}, TContext>;
export declare const getArchiveSubjectUrl: (subjectId: number) => string;
/**
 * @summary Archive a subject
 */
export declare const archiveSubject: (subjectId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Subject>;
export declare const getArchiveSubjectMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveSubject>>, TError, {
        subjectId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof archiveSubject>>, TError, {
    subjectId: number;
}, TContext>;
export type ArchiveSubjectMutationResult = NonNullable<Awaited<ReturnType<typeof archiveSubject>>>;
export type ArchiveSubjectMutationError = ErrorType<unknown>;
/**
* @summary Archive a subject
*/
export declare const useArchiveSubject: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveSubject>>, TError, {
        subjectId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof archiveSubject>>, TError, {
    subjectId: number;
}, TContext>;
export declare const getListChaptersUrl: (params: ListChaptersParams) => string;
/**
 * @summary List chapters for a subject
 */
export declare const listChapters: (params: ListChaptersParams, options?: Parameters<typeof customFetch>[1]) => Promise<Chapter[]>;
export declare const getListChaptersQueryKey: (params?: ListChaptersParams) => readonly ["/api/chapters", ...ListChaptersParams[]];
export declare const getListChaptersQueryOptions: <TData = Awaited<ReturnType<typeof listChapters>>, TError = ErrorType<unknown>>(params: ListChaptersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listChapters>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listChapters>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListChaptersQueryResult = NonNullable<Awaited<ReturnType<typeof listChapters>>>;
export type ListChaptersQueryError = ErrorType<unknown>;
/**
 * @summary List chapters for a subject
 */
export declare function useListChapters<TData = Awaited<ReturnType<typeof listChapters>>, TError = ErrorType<unknown>>(params: ListChaptersParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listChapters>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateChapterUrl: (subjectId: number) => string;
/**
 * @summary Create a chapter
 */
export declare const createChapter: (subjectId: number, chapterInput: ChapterInput, options?: Parameters<typeof customFetch>[1]) => Promise<Chapter>;
export declare const getCreateChapterMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createChapter>>, TError, {
        subjectId: number;
        data: BodyType<ChapterInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createChapter>>, TError, {
    subjectId: number;
    data: BodyType<ChapterInput>;
}, TContext>;
export type CreateChapterMutationResult = NonNullable<Awaited<ReturnType<typeof createChapter>>>;
export type CreateChapterMutationBody = BodyType<ChapterInput>;
export type CreateChapterMutationError = ErrorType<unknown>;
/**
* @summary Create a chapter
*/
export declare const useCreateChapter: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createChapter>>, TError, {
        subjectId: number;
        data: BodyType<ChapterInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createChapter>>, TError, {
    subjectId: number;
    data: BodyType<ChapterInput>;
}, TContext>;
export declare const getGetChapterUrl: (chapterId: number) => string;
/**
 * @summary Get a chapter
 */
export declare const getChapter: (chapterId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Chapter>;
export declare const getGetChapterQueryKey: (chapterId: number) => readonly [`/api/chapters/${number}`];
export declare const getGetChapterQueryOptions: <TData = Awaited<ReturnType<typeof getChapter>>, TError = ErrorType<unknown>>(chapterId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChapter>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getChapter>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetChapterQueryResult = NonNullable<Awaited<ReturnType<typeof getChapter>>>;
export type GetChapterQueryError = ErrorType<unknown>;
/**
 * @summary Get a chapter
 */
export declare function useGetChapter<TData = Awaited<ReturnType<typeof getChapter>>, TError = ErrorType<unknown>>(chapterId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getChapter>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateChapterUrl: (chapterId: number) => string;
/**
 * @summary Update a chapter
 */
export declare const updateChapter: (chapterId: number, chapterUpdate: ChapterUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<Chapter>;
export declare const getUpdateChapterMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateChapter>>, TError, {
        chapterId: number;
        data: BodyType<ChapterUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateChapter>>, TError, {
    chapterId: number;
    data: BodyType<ChapterUpdate>;
}, TContext>;
export type UpdateChapterMutationResult = NonNullable<Awaited<ReturnType<typeof updateChapter>>>;
export type UpdateChapterMutationBody = BodyType<ChapterUpdate>;
export type UpdateChapterMutationError = ErrorType<unknown>;
/**
* @summary Update a chapter
*/
export declare const useUpdateChapter: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateChapter>>, TError, {
        chapterId: number;
        data: BodyType<ChapterUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateChapter>>, TError, {
    chapterId: number;
    data: BodyType<ChapterUpdate>;
}, TContext>;
export declare const getArchiveChapterUrl: (chapterId: number) => string;
/**
 * @summary Archive a chapter
 */
export declare const archiveChapter: (chapterId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Chapter>;
export declare const getArchiveChapterMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveChapter>>, TError, {
        chapterId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof archiveChapter>>, TError, {
    chapterId: number;
}, TContext>;
export type ArchiveChapterMutationResult = NonNullable<Awaited<ReturnType<typeof archiveChapter>>>;
export type ArchiveChapterMutationError = ErrorType<unknown>;
/**
* @summary Archive a chapter
*/
export declare const useArchiveChapter: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveChapter>>, TError, {
        chapterId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof archiveChapter>>, TError, {
    chapterId: number;
}, TContext>;
export declare const getListSectionsUrl: (params: ListSectionsParams) => string;
/**
 * @summary List sections for a chapter
 */
export declare const listSections: (params: ListSectionsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Section[]>;
export declare const getListSectionsQueryKey: (params?: ListSectionsParams) => readonly ["/api/sections", ...ListSectionsParams[]];
export declare const getListSectionsQueryOptions: <TData = Awaited<ReturnType<typeof listSections>>, TError = ErrorType<unknown>>(params: ListSectionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSections>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSections>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSectionsQueryResult = NonNullable<Awaited<ReturnType<typeof listSections>>>;
export type ListSectionsQueryError = ErrorType<unknown>;
/**
 * @summary List sections for a chapter
 */
export declare function useListSections<TData = Awaited<ReturnType<typeof listSections>>, TError = ErrorType<unknown>>(params: ListSectionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSections>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateSectionUrl: (chapterId: number) => string;
/**
 * @summary Create a section
 */
export declare const createSection: (chapterId: number, sectionInput: SectionInput, options?: Parameters<typeof customFetch>[1]) => Promise<Section>;
export declare const getCreateSectionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSection>>, TError, {
        chapterId: number;
        data: BodyType<SectionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createSection>>, TError, {
    chapterId: number;
    data: BodyType<SectionInput>;
}, TContext>;
export type CreateSectionMutationResult = NonNullable<Awaited<ReturnType<typeof createSection>>>;
export type CreateSectionMutationBody = BodyType<SectionInput>;
export type CreateSectionMutationError = ErrorType<unknown>;
/**
* @summary Create a section
*/
export declare const useCreateSection: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createSection>>, TError, {
        chapterId: number;
        data: BodyType<SectionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createSection>>, TError, {
    chapterId: number;
    data: BodyType<SectionInput>;
}, TContext>;
export declare const getGetSectionUrl: (sectionId: number) => string;
/**
 * @summary Get a section
 */
export declare const getSection: (sectionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Section>;
export declare const getGetSectionQueryKey: (sectionId: number) => readonly [`/api/sections/${number}`];
export declare const getGetSectionQueryOptions: <TData = Awaited<ReturnType<typeof getSection>>, TError = ErrorType<unknown>>(sectionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSection>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSection>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSectionQueryResult = NonNullable<Awaited<ReturnType<typeof getSection>>>;
export type GetSectionQueryError = ErrorType<unknown>;
/**
 * @summary Get a section
 */
export declare function useGetSection<TData = Awaited<ReturnType<typeof getSection>>, TError = ErrorType<unknown>>(sectionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSection>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateSectionUrl: (sectionId: number) => string;
/**
 * @summary Update a section
 */
export declare const updateSection: (sectionId: number, sectionUpdate: SectionUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<Section>;
export declare const getUpdateSectionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSection>>, TError, {
        sectionId: number;
        data: BodyType<SectionUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateSection>>, TError, {
    sectionId: number;
    data: BodyType<SectionUpdate>;
}, TContext>;
export type UpdateSectionMutationResult = NonNullable<Awaited<ReturnType<typeof updateSection>>>;
export type UpdateSectionMutationBody = BodyType<SectionUpdate>;
export type UpdateSectionMutationError = ErrorType<unknown>;
/**
* @summary Update a section
*/
export declare const useUpdateSection: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateSection>>, TError, {
        sectionId: number;
        data: BodyType<SectionUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateSection>>, TError, {
    sectionId: number;
    data: BodyType<SectionUpdate>;
}, TContext>;
export declare const getArchiveSectionUrl: (sectionId: number) => string;
/**
 * @summary Archive a section
 */
export declare const archiveSection: (sectionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Section>;
export declare const getArchiveSectionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveSection>>, TError, {
        sectionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof archiveSection>>, TError, {
    sectionId: number;
}, TContext>;
export type ArchiveSectionMutationResult = NonNullable<Awaited<ReturnType<typeof archiveSection>>>;
export type ArchiveSectionMutationError = ErrorType<unknown>;
/**
* @summary Archive a section
*/
export declare const useArchiveSection: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveSection>>, TError, {
        sectionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof archiveSection>>, TError, {
    sectionId: number;
}, TContext>;
export declare const getListQuestionsUrl: (params: ListQuestionsParams) => string;
/**
 * @summary List questions in a section (paginated)
 */
export declare const listQuestions: (params: ListQuestionsParams, options?: Parameters<typeof customFetch>[1]) => Promise<QuestionPage>;
export declare const getListQuestionsQueryKey: (params?: ListQuestionsParams) => readonly ["/api/questions", ...ListQuestionsParams[]];
export declare const getListQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof listQuestions>>, TError = ErrorType<unknown>>(params: ListQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof listQuestions>>>;
export type ListQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary List questions in a section (paginated)
 */
export declare function useListQuestions<TData = Awaited<ReturnType<typeof listQuestions>>, TError = ErrorType<unknown>>(params: ListQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateQuestionUrl: (sectionId: number) => string;
/**
 * @summary Create a question
 */
export declare const createQuestion: (sectionId: number, questionInput: QuestionInput, options?: Parameters<typeof customFetch>[1]) => Promise<Question>;
export declare const getCreateQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createQuestion>>, TError, {
        sectionId: number;
        data: BodyType<QuestionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createQuestion>>, TError, {
    sectionId: number;
    data: BodyType<QuestionInput>;
}, TContext>;
export type CreateQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof createQuestion>>>;
export type CreateQuestionMutationBody = BodyType<QuestionInput>;
export type CreateQuestionMutationError = ErrorType<unknown>;
/**
* @summary Create a question
*/
export declare const useCreateQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createQuestion>>, TError, {
        sectionId: number;
        data: BodyType<QuestionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createQuestion>>, TError, {
    sectionId: number;
    data: BodyType<QuestionInput>;
}, TContext>;
export declare const getBulkCreateQuestionsUrl: (sectionId: number) => string;
/**
 * @summary Bulk create questions in a section
 */
export declare const bulkCreateQuestions: (sectionId: number, bulkQuestionInput: BulkQuestionInput, options?: Parameters<typeof customFetch>[1]) => Promise<Question[]>;
export declare const getBulkCreateQuestionsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof bulkCreateQuestions>>, TError, {
        sectionId: number;
        data: BodyType<BulkQuestionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof bulkCreateQuestions>>, TError, {
    sectionId: number;
    data: BodyType<BulkQuestionInput>;
}, TContext>;
export type BulkCreateQuestionsMutationResult = NonNullable<Awaited<ReturnType<typeof bulkCreateQuestions>>>;
export type BulkCreateQuestionsMutationBody = BodyType<BulkQuestionInput>;
export type BulkCreateQuestionsMutationError = ErrorType<unknown>;
/**
* @summary Bulk create questions in a section
*/
export declare const useBulkCreateQuestions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof bulkCreateQuestions>>, TError, {
        sectionId: number;
        data: BodyType<BulkQuestionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof bulkCreateQuestions>>, TError, {
    sectionId: number;
    data: BodyType<BulkQuestionInput>;
}, TContext>;
export declare const getSearchQuestionsUrl: (params: SearchQuestionsParams) => string;
/**
 * @summary Full-text search across all questions
 */
export declare const searchQuestions: (params: SearchQuestionsParams, options?: Parameters<typeof customFetch>[1]) => Promise<QuestionPage>;
export declare const getSearchQuestionsQueryKey: (params?: SearchQuestionsParams) => readonly ["/api/questions/search", ...SearchQuestionsParams[]];
export declare const getSearchQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof searchQuestions>>, TError = ErrorType<unknown>>(params: SearchQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof searchQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type SearchQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof searchQuestions>>>;
export type SearchQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary Full-text search across all questions
 */
export declare function useSearchQuestions<TData = Awaited<ReturnType<typeof searchQuestions>>, TError = ErrorType<unknown>>(params: SearchQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof searchQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetQuestionUrl: (questionId: number) => string;
/**
 * @summary Get a question
 */
export declare const getQuestion: (questionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Question>;
export declare const getGetQuestionQueryKey: (questionId: number) => readonly [`/api/questions/${number}`];
export declare const getGetQuestionQueryOptions: <TData = Awaited<ReturnType<typeof getQuestion>>, TError = ErrorType<unknown>>(questionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getQuestion>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetQuestionQueryResult = NonNullable<Awaited<ReturnType<typeof getQuestion>>>;
export type GetQuestionQueryError = ErrorType<unknown>;
/**
 * @summary Get a question
 */
export declare function useGetQuestion<TData = Awaited<ReturnType<typeof getQuestion>>, TError = ErrorType<unknown>>(questionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateQuestionUrl: (questionId: number) => string;
/**
 * @summary Update a question (creates new version, archives old)
 */
export declare const updateQuestion: (questionId: number, questionUpdate: QuestionUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<Question>;
export declare const getUpdateQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateQuestion>>, TError, {
        questionId: number;
        data: BodyType<QuestionUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateQuestion>>, TError, {
    questionId: number;
    data: BodyType<QuestionUpdate>;
}, TContext>;
export type UpdateQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof updateQuestion>>>;
export type UpdateQuestionMutationBody = BodyType<QuestionUpdate>;
export type UpdateQuestionMutationError = ErrorType<unknown>;
/**
* @summary Update a question (creates new version, archives old)
*/
export declare const useUpdateQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateQuestion>>, TError, {
        questionId: number;
        data: BodyType<QuestionUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateQuestion>>, TError, {
    questionId: number;
    data: BodyType<QuestionUpdate>;
}, TContext>;
export declare const getArchiveQuestionUrl: (questionId: number) => string;
/**
 * @summary Archive a question
 */
export declare const archiveQuestion: (questionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Question>;
export declare const getArchiveQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveQuestion>>, TError, {
        questionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof archiveQuestion>>, TError, {
    questionId: number;
}, TContext>;
export type ArchiveQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof archiveQuestion>>>;
export type ArchiveQuestionMutationError = ErrorType<unknown>;
/**
* @summary Archive a question
*/
export declare const useArchiveQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof archiveQuestion>>, TError, {
        questionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof archiveQuestion>>, TError, {
    questionId: number;
}, TContext>;
export declare const getListTestsUrl: () => string;
/**
 * @summary List generated tests
 */
export declare const listTests: (options?: Parameters<typeof customFetch>[1]) => Promise<TestSummary[]>;
export declare const getListTestsQueryKey: () => readonly ["/api/tests"];
export declare const getListTestsQueryOptions: <TData = Awaited<ReturnType<typeof listTests>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listTests>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListTestsQueryResult = NonNullable<Awaited<ReturnType<typeof listTests>>>;
export type ListTestsQueryError = ErrorType<unknown>;
/**
 * @summary List generated tests
 */
export declare function useListTests<TData = Awaited<ReturnType<typeof listTests>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listTests>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGenerateTestUrl: () => string;
/**
 * @summary Generate a test from stored questions
 */
export declare const generateTest: (testConfig: TestConfig, options?: Parameters<typeof customFetch>[1]) => Promise<Test>;
export declare const getGenerateTestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateTest>>, TError, {
        data: BodyType<TestConfig>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateTest>>, TError, {
    data: BodyType<TestConfig>;
}, TContext>;
export type GenerateTestMutationResult = NonNullable<Awaited<ReturnType<typeof generateTest>>>;
export type GenerateTestMutationBody = BodyType<TestConfig>;
export type GenerateTestMutationError = ErrorType<unknown>;
/**
* @summary Generate a test from stored questions
*/
export declare const useGenerateTest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateTest>>, TError, {
        data: BodyType<TestConfig>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateTest>>, TError, {
    data: BodyType<TestConfig>;
}, TContext>;
export declare const getGetTestUrl: (testId: number) => string;
/**
 * @summary Get a test with its questions
 */
export declare const getTest: (testId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Test>;
export declare const getGetTestQueryKey: (testId: number) => readonly [`/api/tests/${number}`];
export declare const getGetTestQueryOptions: <TData = Awaited<ReturnType<typeof getTest>>, TError = ErrorType<unknown>>(testId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTest>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getTest>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetTestQueryResult = NonNullable<Awaited<ReturnType<typeof getTest>>>;
export type GetTestQueryError = ErrorType<unknown>;
/**
 * @summary Get a test with its questions
 */
export declare function useGetTest<TData = Awaited<ReturnType<typeof getTest>>, TError = ErrorType<unknown>>(testId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getTest>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSubmitTestUrl: (testId: number) => string;
/**
 * @summary Submit test answers and get results
 */
export declare const submitTest: (testId: number, testSubmission: TestSubmission, options?: Parameters<typeof customFetch>[1]) => Promise<TestResult>;
export declare const getSubmitTestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitTest>>, TError, {
        testId: number;
        data: BodyType<TestSubmission>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitTest>>, TError, {
    testId: number;
    data: BodyType<TestSubmission>;
}, TContext>;
export type SubmitTestMutationResult = NonNullable<Awaited<ReturnType<typeof submitTest>>>;
export type SubmitTestMutationBody = BodyType<TestSubmission>;
export type SubmitTestMutationError = ErrorType<unknown>;
/**
* @summary Submit test answers and get results
*/
export declare const useSubmitTest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitTest>>, TError, {
        testId: number;
        data: BodyType<TestSubmission>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitTest>>, TError, {
    testId: number;
    data: BodyType<TestSubmission>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map