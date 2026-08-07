import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import type { AIChatSession, AIChatSessionPage, AIChatSessionWithMessages, AIGeneratedQuestion, AIGeneratedQuestionPage, AIGradeAnswerInput, AIGradeResponse, AIVerification, AIVerificationDetail, AIVerificationPage, AccuracyResponse, AnalyticsDashboard, AnswerFromBookInput, AnswerFromBookResponse, AuthResponse, BookStore, BookStoreStatusResponse, BulkFlashcardInput, BulkQuestionInput, CalendarResponse, Chapter, ChapterInput, ChapterUpdate, Class, ClassInput, ClassUpdate, CompleteRevisionInput, CountExploredQuestions200, CountExploredQuestionsParams, CreateAIChatSessionInput, CreateBookStoreInput, DashboardStats, ExplainRequest, ExplainResponse, ExploreQuestionsParams, ExplorerResult, FileAssetListResponse, Flashcard, FlashcardInput, FlashcardPage, FlashcardUpdate, ForgotPasswordInput, GenerateQuestionsInput, GenerateQuestionsResponse, GetAIChatSessionParams, GetIndexingStatusParams, GetLearningCalendarParams, GetLearningHeatmapParams, GetLearningReportParams, GetLearningTimelineParams, Goal, HealthStatus, HeatmapResponse, IndexBookResponse, IndexingStatus, ListAIChatSessionsParams, ListAIGeneratedQuestionsParams, ListAIVerificationsParams, ListChaptersParams, ListClassesParams, ListFlashcardsParams, ListGoalsParams, ListMyQuestionStatesParams, ListQuestionsParams, ListSectionTags200, ListSectionsParams, ListSubjectsParams, LoginInput, Question, QuestionInput, QuestionPage, QuestionState, QuestionStateInput, QuestionUpdate, RecentQuestion, RefreshInput, RegisterInput, ReportResponse, ResetPasswordInput, RevisionDue, RevisionUpdate, ScheduleRevisionInput, SearchQuestionsParams, Section, SectionInput, SectionUpdate, SecuritySummary, SelfGradeInput, SelfGradeResult, SendAIChatMessageInput, SendAIChatMessageResponse, Session, SetTodayGoalInput, StreakResponse, Subject, SubjectInput, SubjectUpdate, SuccessResponse, Test, TestConfig, TestDraftInput, TestDraftResponse, TestResult, TestSubmission, TestSummary, TimelineEvent, TopicStat, TotpCodeInput, TotpConfirmResponse, TotpEnrollResponse, TotpVerifyInput, UploadBookIndexInput, User, UserRoleUpdate, VerifyEmailInput, VerifyQuestionInput } from './api.schemas';
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
 * @summary Begin 2FA enrollment â€” returns provisioning URI and QR code
 */
export declare const enroll2fa: (options?: Parameters<typeof customFetch>[1]) => Promise<TotpEnrollResponse>;
export declare const getEnroll2faMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof enroll2fa>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof enroll2fa>>, TError, void, TContext>;
export type Enroll2faMutationResult = NonNullable<Awaited<ReturnType<typeof enroll2fa>>>;
export type Enroll2faMutationError = ErrorType<void>;
/**
* @summary Begin 2FA enrollment â€” returns provisioning URI and QR code
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
export declare const getGetSecuritySummaryUrl: () => string;
/**
 * @summary Get security summary for current user
 */
export declare const getSecuritySummary: (options?: Parameters<typeof customFetch>[1]) => Promise<SecuritySummary>;
export declare const getGetSecuritySummaryQueryKey: () => readonly ["/api/auth/security-summary"];
export declare const getGetSecuritySummaryQueryOptions: <TData = Awaited<ReturnType<typeof getSecuritySummary>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSecuritySummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getSecuritySummary>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetSecuritySummaryQueryResult = NonNullable<Awaited<ReturnType<typeof getSecuritySummary>>>;
export type GetSecuritySummaryQueryError = ErrorType<void>;
/**
 * @summary Get security summary for current user
 */
export declare function useGetSecuritySummary<TData = Awaited<ReturnType<typeof getSecuritySummary>>, TError = ErrorType<void>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getSecuritySummary>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
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
export declare const getExploreQuestionsUrl: (params: ExploreQuestionsParams) => string;
/**
 * @summary Explore questions with keyset pagination and filters
 */
export declare const exploreQuestions: (params: ExploreQuestionsParams, options?: Parameters<typeof customFetch>[1]) => Promise<ExplorerResult>;
export declare const getExploreQuestionsQueryKey: (params?: ExploreQuestionsParams) => readonly ["/api/questions/explorer", ...ExploreQuestionsParams[]];
export declare const getExploreQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof exploreQuestions>>, TError = ErrorType<unknown>>(params: ExploreQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exploreQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof exploreQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ExploreQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof exploreQuestions>>>;
export type ExploreQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary Explore questions with keyset pagination and filters
 */
export declare function useExploreQuestions<TData = Awaited<ReturnType<typeof exploreQuestions>>, TError = ErrorType<unknown>>(params: ExploreQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof exploreQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCountExploredQuestionsUrl: (params: CountExploredQuestionsParams) => string;
/**
 * @summary Count questions matching explorer filters
 */
export declare const countExploredQuestions: (params: CountExploredQuestionsParams, options?: Parameters<typeof customFetch>[1]) => Promise<CountExploredQuestions200>;
export declare const getCountExploredQuestionsQueryKey: (params?: CountExploredQuestionsParams) => readonly ["/api/questions/explorer/count", ...CountExploredQuestionsParams[]];
export declare const getCountExploredQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof countExploredQuestions>>, TError = ErrorType<unknown>>(params: CountExploredQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof countExploredQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof countExploredQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type CountExploredQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof countExploredQuestions>>>;
export type CountExploredQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary Count questions matching explorer filters
 */
export declare function useCountExploredQuestions<TData = Awaited<ReturnType<typeof countExploredQuestions>>, TError = ErrorType<unknown>>(params: CountExploredQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof countExploredQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListSectionTagsUrl: (sectionId: number) => string;
/**
 * @summary List distinct tags used across a section's questions
 */
export declare const listSectionTags: (sectionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<ListSectionTags200>;
export declare const getListSectionTagsQueryKey: (sectionId: number) => readonly [`/api/sections/${number}/tags`];
export declare const getListSectionTagsQueryOptions: <TData = Awaited<ReturnType<typeof listSectionTags>>, TError = ErrorType<unknown>>(sectionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSectionTags>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSectionTags>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSectionTagsQueryResult = NonNullable<Awaited<ReturnType<typeof listSectionTags>>>;
export type ListSectionTagsQueryError = ErrorType<unknown>;
/**
 * @summary List distinct tags used across a section's questions
 */
export declare function useListSectionTags<TData = Awaited<ReturnType<typeof listSectionTags>>, TError = ErrorType<unknown>>(sectionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSectionTags>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
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
export declare const getGetQuestionStateUrl: (questionId: number) => string;
/**
 * @summary Get current user's state for a question
 */
export declare const getQuestionState: (questionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<QuestionState>;
export declare const getGetQuestionStateQueryKey: (questionId: number) => readonly [`/api/questions/${number}/state`];
export declare const getGetQuestionStateQueryOptions: <TData = Awaited<ReturnType<typeof getQuestionState>>, TError = ErrorType<unknown>>(questionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuestionState>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getQuestionState>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetQuestionStateQueryResult = NonNullable<Awaited<ReturnType<typeof getQuestionState>>>;
export type GetQuestionStateQueryError = ErrorType<unknown>;
/**
 * @summary Get current user's state for a question
 */
export declare function useGetQuestionState<TData = Awaited<ReturnType<typeof getQuestionState>>, TError = ErrorType<unknown>>(questionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getQuestionState>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSetQuestionStateUrl: (questionId: number) => string;
/**
 * @summary Set current user's state for a question
 */
export declare const setQuestionState: (questionId: number, questionStateInput: QuestionStateInput, options?: Parameters<typeof customFetch>[1]) => Promise<QuestionState>;
export declare const getSetQuestionStateMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setQuestionState>>, TError, {
        questionId: number;
        data: BodyType<QuestionStateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setQuestionState>>, TError, {
    questionId: number;
    data: BodyType<QuestionStateInput>;
}, TContext>;
export type SetQuestionStateMutationResult = NonNullable<Awaited<ReturnType<typeof setQuestionState>>>;
export type SetQuestionStateMutationBody = BodyType<QuestionStateInput>;
export type SetQuestionStateMutationError = ErrorType<unknown>;
/**
* @summary Set current user's state for a question
*/
export declare const useSetQuestionState: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setQuestionState>>, TError, {
        questionId: number;
        data: BodyType<QuestionStateInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setQuestionState>>, TError, {
    questionId: number;
    data: BodyType<QuestionStateInput>;
}, TContext>;
export declare const getListMyQuestionStatesUrl: (params?: ListMyQuestionStatesParams) => string;
/**
 * @summary List current user's question states (bookmarks, mistakes)
 */
export declare const listMyQuestionStates: (params?: ListMyQuestionStatesParams, options?: Parameters<typeof customFetch>[1]) => Promise<QuestionState[]>;
export declare const getListMyQuestionStatesQueryKey: (params?: ListMyQuestionStatesParams) => readonly ["/api/my/question-states", ...ListMyQuestionStatesParams[]];
export declare const getListMyQuestionStatesQueryOptions: <TData = Awaited<ReturnType<typeof listMyQuestionStates>>, TError = ErrorType<unknown>>(params?: ListMyQuestionStatesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMyQuestionStates>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listMyQuestionStates>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListMyQuestionStatesQueryResult = NonNullable<Awaited<ReturnType<typeof listMyQuestionStates>>>;
export type ListMyQuestionStatesQueryError = ErrorType<unknown>;
/**
 * @summary List current user's question states (bookmarks, mistakes)
 */
export declare function useListMyQuestionStates<TData = Awaited<ReturnType<typeof listMyQuestionStates>>, TError = ErrorType<unknown>>(params?: ListMyQuestionStatesParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listMyQuestionStates>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getListFlashcardsUrl: (params: ListFlashcardsParams) => string;
/**
 * @summary List flashcards in a section
 */
export declare const listFlashcards: (params: ListFlashcardsParams, options?: Parameters<typeof customFetch>[1]) => Promise<FlashcardPage>;
export declare const getListFlashcardsQueryKey: (params?: ListFlashcardsParams) => readonly ["/api/flashcards", ...ListFlashcardsParams[]];
export declare const getListFlashcardsQueryOptions: <TData = Awaited<ReturnType<typeof listFlashcards>>, TError = ErrorType<unknown>>(params: ListFlashcardsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFlashcards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listFlashcards>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListFlashcardsQueryResult = NonNullable<Awaited<ReturnType<typeof listFlashcards>>>;
export type ListFlashcardsQueryError = ErrorType<unknown>;
/**
 * @summary List flashcards in a section
 */
export declare function useListFlashcards<TData = Awaited<ReturnType<typeof listFlashcards>>, TError = ErrorType<unknown>>(params: ListFlashcardsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listFlashcards>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateFlashcardUrl: (sectionId: number) => string;
/**
 * @summary Create a flashcard
 */
export declare const createFlashcard: (sectionId: number, flashcardInput: FlashcardInput, options?: Parameters<typeof customFetch>[1]) => Promise<Flashcard>;
export declare const getCreateFlashcardMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFlashcard>>, TError, {
        sectionId: number;
        data: BodyType<FlashcardInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createFlashcard>>, TError, {
    sectionId: number;
    data: BodyType<FlashcardInput>;
}, TContext>;
export type CreateFlashcardMutationResult = NonNullable<Awaited<ReturnType<typeof createFlashcard>>>;
export type CreateFlashcardMutationBody = BodyType<FlashcardInput>;
export type CreateFlashcardMutationError = ErrorType<unknown>;
/**
* @summary Create a flashcard
*/
export declare const useCreateFlashcard: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createFlashcard>>, TError, {
        sectionId: number;
        data: BodyType<FlashcardInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createFlashcard>>, TError, {
    sectionId: number;
    data: BodyType<FlashcardInput>;
}, TContext>;
export declare const getBulkCreateFlashcardsUrl: (sectionId: number) => string;
/**
 * @summary Bulk create flashcards in a section
 */
export declare const bulkCreateFlashcards: (sectionId: number, bulkFlashcardInput: BulkFlashcardInput, options?: Parameters<typeof customFetch>[1]) => Promise<Flashcard[]>;
export declare const getBulkCreateFlashcardsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof bulkCreateFlashcards>>, TError, {
        sectionId: number;
        data: BodyType<BulkFlashcardInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof bulkCreateFlashcards>>, TError, {
    sectionId: number;
    data: BodyType<BulkFlashcardInput>;
}, TContext>;
export type BulkCreateFlashcardsMutationResult = NonNullable<Awaited<ReturnType<typeof bulkCreateFlashcards>>>;
export type BulkCreateFlashcardsMutationBody = BodyType<BulkFlashcardInput>;
export type BulkCreateFlashcardsMutationError = ErrorType<unknown>;
/**
* @summary Bulk create flashcards in a section
*/
export declare const useBulkCreateFlashcards: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof bulkCreateFlashcards>>, TError, {
        sectionId: number;
        data: BodyType<BulkFlashcardInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof bulkCreateFlashcards>>, TError, {
    sectionId: number;
    data: BodyType<BulkFlashcardInput>;
}, TContext>;
export declare const getGetFlashcardUrl: (flashcardId: number) => string;
/**
 * @summary Get a flashcard
 */
export declare const getFlashcard: (flashcardId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Flashcard>;
export declare const getGetFlashcardQueryKey: (flashcardId: number) => readonly [`/api/flashcards/${number}`];
export declare const getGetFlashcardQueryOptions: <TData = Awaited<ReturnType<typeof getFlashcard>>, TError = ErrorType<unknown>>(flashcardId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlashcard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getFlashcard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetFlashcardQueryResult = NonNullable<Awaited<ReturnType<typeof getFlashcard>>>;
export type GetFlashcardQueryError = ErrorType<unknown>;
/**
 * @summary Get a flashcard
 */
export declare function useGetFlashcard<TData = Awaited<ReturnType<typeof getFlashcard>>, TError = ErrorType<unknown>>(flashcardId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getFlashcard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getUpdateFlashcardUrl: (flashcardId: number) => string;
/**
 * @summary Update a flashcard
 */
export declare const updateFlashcard: (flashcardId: number, flashcardUpdate: FlashcardUpdate, options?: Parameters<typeof customFetch>[1]) => Promise<Flashcard>;
export declare const getUpdateFlashcardMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFlashcard>>, TError, {
        flashcardId: number;
        data: BodyType<FlashcardUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateFlashcard>>, TError, {
    flashcardId: number;
    data: BodyType<FlashcardUpdate>;
}, TContext>;
export type UpdateFlashcardMutationResult = NonNullable<Awaited<ReturnType<typeof updateFlashcard>>>;
export type UpdateFlashcardMutationBody = BodyType<FlashcardUpdate>;
export type UpdateFlashcardMutationError = ErrorType<unknown>;
/**
* @summary Update a flashcard
*/
export declare const useUpdateFlashcard: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateFlashcard>>, TError, {
        flashcardId: number;
        data: BodyType<FlashcardUpdate>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateFlashcard>>, TError, {
    flashcardId: number;
    data: BodyType<FlashcardUpdate>;
}, TContext>;
export declare const getDeleteFlashcardUrl: (flashcardId: number) => string;
/**
 * @summary Archive/delete a flashcard
 */
export declare const deleteFlashcard: (flashcardId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteFlashcardMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFlashcard>>, TError, {
        flashcardId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteFlashcard>>, TError, {
    flashcardId: number;
}, TContext>;
export type DeleteFlashcardMutationResult = NonNullable<Awaited<ReturnType<typeof deleteFlashcard>>>;
export type DeleteFlashcardMutationError = ErrorType<unknown>;
/**
* @summary Archive/delete a flashcard
*/
export declare const useDeleteFlashcard: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteFlashcard>>, TError, {
        flashcardId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteFlashcard>>, TError, {
    flashcardId: number;
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
export declare const getSaveTestDraftUrl: (testId: number) => string;
/**
 * @summary Autosave an in-progress attempt
 */
export declare const saveTestDraft: (testId: number, testDraftInput: TestDraftInput, options?: Parameters<typeof customFetch>[1]) => Promise<TestDraftResponse>;
export declare const getSaveTestDraftMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveTestDraft>>, TError, {
        testId: number;
        data: BodyType<TestDraftInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof saveTestDraft>>, TError, {
    testId: number;
    data: BodyType<TestDraftInput>;
}, TContext>;
export type SaveTestDraftMutationResult = NonNullable<Awaited<ReturnType<typeof saveTestDraft>>>;
export type SaveTestDraftMutationBody = BodyType<TestDraftInput>;
export type SaveTestDraftMutationError = ErrorType<unknown>;
/**
* @summary Autosave an in-progress attempt
*/
export declare const useSaveTestDraft: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof saveTestDraft>>, TError, {
        testId: number;
        data: BodyType<TestDraftInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof saveTestDraft>>, TError, {
    testId: number;
    data: BodyType<TestDraftInput>;
}, TContext>;
export declare const getSelfGradeTestUrl: (testId: number, attemptId: number) => string;
/**
 * @summary Self-grade written answers of an attempt
 */
export declare const selfGradeTest: (testId: number, attemptId: number, selfGradeInput: SelfGradeInput, options?: Parameters<typeof customFetch>[1]) => Promise<SelfGradeResult>;
export declare const getSelfGradeTestMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof selfGradeTest>>, TError, {
        testId: number;
        attemptId: number;
        data: BodyType<SelfGradeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof selfGradeTest>>, TError, {
    testId: number;
    attemptId: number;
    data: BodyType<SelfGradeInput>;
}, TContext>;
export type SelfGradeTestMutationResult = NonNullable<Awaited<ReturnType<typeof selfGradeTest>>>;
export type SelfGradeTestMutationBody = BodyType<SelfGradeInput>;
export type SelfGradeTestMutationError = ErrorType<unknown>;
/**
* @summary Self-grade written answers of an attempt
*/
export declare const useSelfGradeTest: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof selfGradeTest>>, TError, {
        testId: number;
        attemptId: number;
        data: BodyType<SelfGradeInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof selfGradeTest>>, TError, {
    testId: number;
    attemptId: number;
    data: BodyType<SelfGradeInput>;
}, TContext>;
export declare const getGetDueRevisionsUrl: () => string;
/**
 * @summary List revision questions that are due now
 */
export declare const getDueRevisions: (options?: Parameters<typeof customFetch>[1]) => Promise<RevisionDue[]>;
export declare const getGetDueRevisionsQueryKey: () => readonly ["/api/revisions/due"];
export declare const getGetDueRevisionsQueryOptions: <TData = Awaited<ReturnType<typeof getDueRevisions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDueRevisions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getDueRevisions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetDueRevisionsQueryResult = NonNullable<Awaited<ReturnType<typeof getDueRevisions>>>;
export type GetDueRevisionsQueryError = ErrorType<unknown>;
/**
 * @summary List revision questions that are due now
 */
export declare function useGetDueRevisions<TData = Awaited<ReturnType<typeof getDueRevisions>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getDueRevisions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getScheduleRevisionUrl: () => string;
/**
 * @summary Schedule questions for revision
 */
export declare const scheduleRevision: (scheduleRevisionInput: ScheduleRevisionInput, options?: Parameters<typeof customFetch>[1]) => Promise<RevisionUpdate[]>;
export declare const getScheduleRevisionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof scheduleRevision>>, TError, {
        data: BodyType<ScheduleRevisionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof scheduleRevision>>, TError, {
    data: BodyType<ScheduleRevisionInput>;
}, TContext>;
export type ScheduleRevisionMutationResult = NonNullable<Awaited<ReturnType<typeof scheduleRevision>>>;
export type ScheduleRevisionMutationBody = BodyType<ScheduleRevisionInput>;
export type ScheduleRevisionMutationError = ErrorType<unknown>;
/**
* @summary Schedule questions for revision
*/
export declare const useScheduleRevision: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof scheduleRevision>>, TError, {
        data: BodyType<ScheduleRevisionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof scheduleRevision>>, TError, {
    data: BodyType<ScheduleRevisionInput>;
}, TContext>;
export declare const getCompleteRevisionUrl: (revisionId: number) => string;
/**
 * @summary Mark a revision complete and reschedule
 */
export declare const completeRevision: (revisionId: number, completeRevisionInput: CompleteRevisionInput, options?: Parameters<typeof customFetch>[1]) => Promise<RevisionUpdate>;
export declare const getCompleteRevisionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeRevision>>, TError, {
        revisionId: number;
        data: BodyType<CompleteRevisionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof completeRevision>>, TError, {
    revisionId: number;
    data: BodyType<CompleteRevisionInput>;
}, TContext>;
export type CompleteRevisionMutationResult = NonNullable<Awaited<ReturnType<typeof completeRevision>>>;
export type CompleteRevisionMutationBody = BodyType<CompleteRevisionInput>;
export type CompleteRevisionMutationError = ErrorType<unknown>;
/**
* @summary Mark a revision complete and reschedule
*/
export declare const useCompleteRevision: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof completeRevision>>, TError, {
        revisionId: number;
        data: BodyType<CompleteRevisionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof completeRevision>>, TError, {
    revisionId: number;
    data: BodyType<CompleteRevisionInput>;
}, TContext>;
export declare const getListGoalsUrl: (params?: ListGoalsParams) => string;
/**
 * @summary List daily goals
 */
export declare const listGoals: (params?: ListGoalsParams, options?: Parameters<typeof customFetch>[1]) => Promise<Goal[]>;
export declare const getListGoalsQueryKey: (params?: ListGoalsParams) => readonly ["/api/goals", ...ListGoalsParams[]];
export declare const getListGoalsQueryOptions: <TData = Awaited<ReturnType<typeof listGoals>>, TError = ErrorType<unknown>>(params?: ListGoalsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGoals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listGoals>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListGoalsQueryResult = NonNullable<Awaited<ReturnType<typeof listGoals>>>;
export type ListGoalsQueryError = ErrorType<unknown>;
/**
 * @summary List daily goals
 */
export declare function useListGoals<TData = Awaited<ReturnType<typeof listGoals>>, TError = ErrorType<unknown>>(params?: ListGoalsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listGoals>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSetTodayGoalUrl: () => string;
/**
 * @summary Create or update today's goal
 */
export declare const setTodayGoal: (setTodayGoalInput: SetTodayGoalInput, options?: Parameters<typeof customFetch>[1]) => Promise<Goal>;
export declare const getSetTodayGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setTodayGoal>>, TError, {
        data: BodyType<SetTodayGoalInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setTodayGoal>>, TError, {
    data: BodyType<SetTodayGoalInput>;
}, TContext>;
export type SetTodayGoalMutationResult = NonNullable<Awaited<ReturnType<typeof setTodayGoal>>>;
export type SetTodayGoalMutationBody = BodyType<SetTodayGoalInput>;
export type SetTodayGoalMutationError = ErrorType<unknown>;
/**
* @summary Create or update today's goal
*/
export declare const useSetTodayGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setTodayGoal>>, TError, {
        data: BodyType<SetTodayGoalInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setTodayGoal>>, TError, {
    data: BodyType<SetTodayGoalInput>;
}, TContext>;
export declare const getUpdateGoalUrl: (goalId: number) => string;
/**
 * @summary Update a goal
 */
export declare const updateGoal: (goalId: number, setTodayGoalInput: SetTodayGoalInput, options?: Parameters<typeof customFetch>[1]) => Promise<Goal>;
export declare const getUpdateGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
        goalId: number;
        data: BodyType<SetTodayGoalInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
    goalId: number;
    data: BodyType<SetTodayGoalInput>;
}, TContext>;
export type UpdateGoalMutationResult = NonNullable<Awaited<ReturnType<typeof updateGoal>>>;
export type UpdateGoalMutationBody = BodyType<SetTodayGoalInput>;
export type UpdateGoalMutationError = ErrorType<unknown>;
/**
* @summary Update a goal
*/
export declare const useUpdateGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof updateGoal>>, TError, {
        goalId: number;
        data: BodyType<SetTodayGoalInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof updateGoal>>, TError, {
    goalId: number;
    data: BodyType<SetTodayGoalInput>;
}, TContext>;
export declare const getDeleteGoalUrl: (goalId: number) => string;
/**
 * @summary Delete a goal
 */
export declare const deleteGoal: (goalId: number, options?: Parameters<typeof customFetch>[1]) => Promise<void>;
export declare const getDeleteGoalMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
        goalId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
    goalId: number;
}, TContext>;
export type DeleteGoalMutationResult = NonNullable<Awaited<ReturnType<typeof deleteGoal>>>;
export type DeleteGoalMutationError = ErrorType<unknown>;
/**
* @summary Delete a goal
*/
export declare const useDeleteGoal: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteGoal>>, TError, {
        goalId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof deleteGoal>>, TError, {
    goalId: number;
}, TContext>;
export declare const getGetLearningCalendarUrl: (params?: GetLearningCalendarParams) => string;
/**
 * @summary Monthly study calendar with daily totals and goals
 */
export declare const getLearningCalendar: (params?: GetLearningCalendarParams, options?: Parameters<typeof customFetch>[1]) => Promise<CalendarResponse>;
export declare const getGetLearningCalendarQueryKey: (params?: GetLearningCalendarParams) => readonly ["/api/learning-hub/calendar", ...GetLearningCalendarParams[]];
export declare const getGetLearningCalendarQueryOptions: <TData = Awaited<ReturnType<typeof getLearningCalendar>>, TError = ErrorType<unknown>>(params?: GetLearningCalendarParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningCalendar>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLearningCalendar>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLearningCalendarQueryResult = NonNullable<Awaited<ReturnType<typeof getLearningCalendar>>>;
export type GetLearningCalendarQueryError = ErrorType<unknown>;
/**
 * @summary Monthly study calendar with daily totals and goals
 */
export declare function useGetLearningCalendar<TData = Awaited<ReturnType<typeof getLearningCalendar>>, TError = ErrorType<unknown>>(params?: GetLearningCalendarParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningCalendar>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetLearningTimelineUrl: (params?: GetLearningTimelineParams) => string;
/**
 * @summary Recent study activity timeline
 */
export declare const getLearningTimeline: (params?: GetLearningTimelineParams, options?: Parameters<typeof customFetch>[1]) => Promise<TimelineEvent[]>;
export declare const getGetLearningTimelineQueryKey: (params?: GetLearningTimelineParams) => readonly ["/api/learning-hub/timeline", ...GetLearningTimelineParams[]];
export declare const getGetLearningTimelineQueryOptions: <TData = Awaited<ReturnType<typeof getLearningTimeline>>, TError = ErrorType<unknown>>(params?: GetLearningTimelineParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningTimeline>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLearningTimeline>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLearningTimelineQueryResult = NonNullable<Awaited<ReturnType<typeof getLearningTimeline>>>;
export type GetLearningTimelineQueryError = ErrorType<unknown>;
/**
 * @summary Recent study activity timeline
 */
export declare function useGetLearningTimeline<TData = Awaited<ReturnType<typeof getLearningTimeline>>, TError = ErrorType<unknown>>(params?: GetLearningTimelineParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningTimeline>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetLearningHeatmapUrl: (params?: GetLearningHeatmapParams) => string;
/**
 * @summary Yearly activity heatmap
 */
export declare const getLearningHeatmap: (params?: GetLearningHeatmapParams, options?: Parameters<typeof customFetch>[1]) => Promise<HeatmapResponse>;
export declare const getGetLearningHeatmapQueryKey: (params?: GetLearningHeatmapParams) => readonly ["/api/learning-hub/heatmap", ...GetLearningHeatmapParams[]];
export declare const getGetLearningHeatmapQueryOptions: <TData = Awaited<ReturnType<typeof getLearningHeatmap>>, TError = ErrorType<unknown>>(params?: GetLearningHeatmapParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningHeatmap>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLearningHeatmap>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLearningHeatmapQueryResult = NonNullable<Awaited<ReturnType<typeof getLearningHeatmap>>>;
export type GetLearningHeatmapQueryError = ErrorType<unknown>;
/**
 * @summary Yearly activity heatmap
 */
export declare function useGetLearningHeatmap<TData = Awaited<ReturnType<typeof getLearningHeatmap>>, TError = ErrorType<unknown>>(params?: GetLearningHeatmapParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningHeatmap>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetLearningStreakUrl: () => string;
/**
 * @summary Current and best study streak
 */
export declare const getLearningStreak: (options?: Parameters<typeof customFetch>[1]) => Promise<StreakResponse>;
export declare const getGetLearningStreakQueryKey: () => readonly ["/api/learning-hub/streak"];
export declare const getGetLearningStreakQueryOptions: <TData = Awaited<ReturnType<typeof getLearningStreak>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningStreak>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLearningStreak>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLearningStreakQueryResult = NonNullable<Awaited<ReturnType<typeof getLearningStreak>>>;
export type GetLearningStreakQueryError = ErrorType<unknown>;
/**
 * @summary Current and best study streak
 */
export declare function useGetLearningStreak<TData = Awaited<ReturnType<typeof getLearningStreak>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningStreak>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetLearningReportUrl: (params?: GetLearningReportParams) => string;
/**
 * @summary Weekly or monthly study report
 */
export declare const getLearningReport: (params?: GetLearningReportParams, options?: Parameters<typeof customFetch>[1]) => Promise<ReportResponse>;
export declare const getGetLearningReportQueryKey: (params?: GetLearningReportParams) => readonly ["/api/learning-hub/reports", ...GetLearningReportParams[]];
export declare const getGetLearningReportQueryOptions: <TData = Awaited<ReturnType<typeof getLearningReport>>, TError = ErrorType<unknown>>(params?: GetLearningReportParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLearningReport>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLearningReportQueryResult = NonNullable<Awaited<ReturnType<typeof getLearningReport>>>;
export type GetLearningReportQueryError = ErrorType<unknown>;
/**
 * @summary Weekly or monthly study report
 */
export declare function useGetLearningReport<TData = Awaited<ReturnType<typeof getLearningReport>>, TError = ErrorType<unknown>>(params?: GetLearningReportParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLearningReport>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAnalyticsAccuracyUrl: () => string;
/**
 * @summary Overall answer accuracy
 */
export declare const getAnalyticsAccuracy: (options?: Parameters<typeof customFetch>[1]) => Promise<AccuracyResponse>;
export declare const getGetAnalyticsAccuracyQueryKey: () => readonly ["/api/analytics/accuracy"];
export declare const getGetAnalyticsAccuracyQueryOptions: <TData = Awaited<ReturnType<typeof getAnalyticsAccuracy>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsAccuracy>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsAccuracy>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAnalyticsAccuracyQueryResult = NonNullable<Awaited<ReturnType<typeof getAnalyticsAccuracy>>>;
export type GetAnalyticsAccuracyQueryError = ErrorType<unknown>;
/**
 * @summary Overall answer accuracy
 */
export declare function useGetAnalyticsAccuracy<TData = Awaited<ReturnType<typeof getAnalyticsAccuracy>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsAccuracy>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAnalyticsTopicsUrl: () => string;
/**
 * @summary Per-topic accuracy with weak/strong signals
 */
export declare const getAnalyticsTopics: (options?: Parameters<typeof customFetch>[1]) => Promise<TopicStat[]>;
export declare const getGetAnalyticsTopicsQueryKey: () => readonly ["/api/analytics/topics"];
export declare const getGetAnalyticsTopicsQueryOptions: <TData = Awaited<ReturnType<typeof getAnalyticsTopics>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsTopics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsTopics>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAnalyticsTopicsQueryResult = NonNullable<Awaited<ReturnType<typeof getAnalyticsTopics>>>;
export type GetAnalyticsTopicsQueryError = ErrorType<unknown>;
/**
 * @summary Per-topic accuracy with weak/strong signals
 */
export declare function useGetAnalyticsTopics<TData = Awaited<ReturnType<typeof getAnalyticsTopics>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsTopics>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAnalyticsMasteryUrl: () => string;
/**
 * @summary Per-topic mastery scores (ascending)
 */
export declare const getAnalyticsMastery: (options?: Parameters<typeof customFetch>[1]) => Promise<TopicStat[]>;
export declare const getGetAnalyticsMasteryQueryKey: () => readonly ["/api/analytics/mastery"];
export declare const getGetAnalyticsMasteryQueryOptions: <TData = Awaited<ReturnType<typeof getAnalyticsMastery>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsMastery>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsMastery>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAnalyticsMasteryQueryResult = NonNullable<Awaited<ReturnType<typeof getAnalyticsMastery>>>;
export type GetAnalyticsMasteryQueryError = ErrorType<unknown>;
/**
 * @summary Per-topic mastery scores (ascending)
 */
export declare function useGetAnalyticsMastery<TData = Awaited<ReturnType<typeof getAnalyticsMastery>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsMastery>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAnalyticsDashboardUrl: () => string;
/**
 * @summary Aggregated analytics dashboard summary
 */
export declare const getAnalyticsDashboard: (options?: Parameters<typeof customFetch>[1]) => Promise<AnalyticsDashboard>;
export declare const getGetAnalyticsDashboardQueryKey: () => readonly ["/api/analytics/dashboard"];
export declare const getGetAnalyticsDashboardQueryOptions: <TData = Awaited<ReturnType<typeof getAnalyticsDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsDashboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAnalyticsDashboardQueryResult = NonNullable<Awaited<ReturnType<typeof getAnalyticsDashboard>>>;
export type GetAnalyticsDashboardQueryError = ErrorType<unknown>;
/**
 * @summary Aggregated analytics dashboard summary
 */
export declare function useGetAnalyticsDashboard<TData = Awaited<ReturnType<typeof getAnalyticsDashboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAnalyticsDashboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetBookStoreStatusUrl: (subjectId: number) => string;
/**
 * @summary Get book store status for a subject
 */
export declare const getBookStoreStatus: (subjectId: number, options?: Parameters<typeof customFetch>[1]) => Promise<BookStoreStatusResponse>;
export declare const getGetBookStoreStatusQueryKey: (subjectId: number) => readonly [`/api/subjects/${number}/book-store`];
export declare const getGetBookStoreStatusQueryOptions: <TData = Awaited<ReturnType<typeof getBookStoreStatus>>, TError = ErrorType<unknown>>(subjectId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBookStoreStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getBookStoreStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetBookStoreStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getBookStoreStatus>>>;
export type GetBookStoreStatusQueryError = ErrorType<unknown>;
/**
 * @summary Get book store status for a subject
 */
export declare function useGetBookStoreStatus<TData = Awaited<ReturnType<typeof getBookStoreStatus>>, TError = ErrorType<unknown>>(subjectId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getBookStoreStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateBookStoreUrl: (subjectId: number) => string;
/**
 * @summary Create a new book store for a subject
 */
export declare const createBookStore: (subjectId: number, createBookStoreInput: CreateBookStoreInput, options?: Parameters<typeof customFetch>[1]) => Promise<BookStore>;
export declare const getCreateBookStoreMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBookStore>>, TError, {
        subjectId: number;
        data: BodyType<CreateBookStoreInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createBookStore>>, TError, {
    subjectId: number;
    data: BodyType<CreateBookStoreInput>;
}, TContext>;
export type CreateBookStoreMutationResult = NonNullable<Awaited<ReturnType<typeof createBookStore>>>;
export type CreateBookStoreMutationBody = BodyType<CreateBookStoreInput>;
export type CreateBookStoreMutationError = ErrorType<void>;
/**
* @summary Create a new book store for a subject
*/
export declare const useCreateBookStore: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createBookStore>>, TError, {
        subjectId: number;
        data: BodyType<CreateBookStoreInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createBookStore>>, TError, {
    subjectId: number;
    data: BodyType<CreateBookStoreInput>;
}, TContext>;
export declare const getIndexBookUrl: (subjectId: number) => string;
/**
 * @summary Upload and index a textbook into the subject's book store
 */
export declare const indexBook: (subjectId: number, uploadBookIndexInput: UploadBookIndexInput, options?: Parameters<typeof customFetch>[1]) => Promise<IndexBookResponse>;
export declare const getIndexBookMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof indexBook>>, TError, {
        subjectId: number;
        data: BodyType<UploadBookIndexInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof indexBook>>, TError, {
    subjectId: number;
    data: BodyType<UploadBookIndexInput>;
}, TContext>;
export type IndexBookMutationResult = NonNullable<Awaited<ReturnType<typeof indexBook>>>;
export type IndexBookMutationBody = BodyType<UploadBookIndexInput>;
export type IndexBookMutationError = ErrorType<unknown>;
/**
* @summary Upload and index a textbook into the subject's book store
*/
export declare const useIndexBook: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof indexBook>>, TError, {
        subjectId: number;
        data: BodyType<UploadBookIndexInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof indexBook>>, TError, {
    subjectId: number;
    data: BodyType<UploadBookIndexInput>;
}, TContext>;
export declare const getGetIndexingStatusUrl: (storeId: number, params: GetIndexingStatusParams) => string;
/**
 * @summary Check indexing operation status
 */
export declare const getIndexingStatus: (storeId: number, params: GetIndexingStatusParams, options?: Parameters<typeof customFetch>[1]) => Promise<IndexingStatus>;
export declare const getGetIndexingStatusQueryKey: (storeId: number, params?: GetIndexingStatusParams) => readonly [`/api/book-stores/${number}/indexing-status`, ...GetIndexingStatusParams[]];
export declare const getGetIndexingStatusQueryOptions: <TData = Awaited<ReturnType<typeof getIndexingStatus>>, TError = ErrorType<unknown>>(storeId: number, params: GetIndexingStatusParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getIndexingStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getIndexingStatus>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetIndexingStatusQueryResult = NonNullable<Awaited<ReturnType<typeof getIndexingStatus>>>;
export type GetIndexingStatusQueryError = ErrorType<unknown>;
/**
 * @summary Check indexing operation status
 */
export declare function useGetIndexingStatus<TData = Awaited<ReturnType<typeof getIndexingStatus>>, TError = ErrorType<unknown>>(storeId: number, params: GetIndexingStatusParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getIndexingStatus>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getExplainFromBookUrl: () => string;
/**
 * @summary Generate a textbook-grounded explanation with citations
 */
export declare const explainFromBook: (explainRequest: ExplainRequest, options?: Parameters<typeof customFetch>[1]) => Promise<ExplainResponse>;
export declare const getExplainFromBookMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof explainFromBook>>, TError, {
        data: BodyType<ExplainRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof explainFromBook>>, TError, {
    data: BodyType<ExplainRequest>;
}, TContext>;
export type ExplainFromBookMutationResult = NonNullable<Awaited<ReturnType<typeof explainFromBook>>>;
export type ExplainFromBookMutationBody = BodyType<ExplainRequest>;
export type ExplainFromBookMutationError = ErrorType<unknown>;
/**
* @summary Generate a textbook-grounded explanation with citations
*/
export declare const useExplainFromBook: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof explainFromBook>>, TError, {
        data: BodyType<ExplainRequest>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof explainFromBook>>, TError, {
    data: BodyType<ExplainRequest>;
}, TContext>;
export declare const getVerifyQuestionUrl: () => string;
/**
 * @summary Queue a question for verification against the textbook
 */
export declare const verifyQuestion: (verifyQuestionInput: VerifyQuestionInput, options?: Parameters<typeof customFetch>[1]) => Promise<AIVerification>;
export declare const getVerifyQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyQuestion>>, TError, {
        data: BodyType<VerifyQuestionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof verifyQuestion>>, TError, {
    data: BodyType<VerifyQuestionInput>;
}, TContext>;
export type VerifyQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof verifyQuestion>>>;
export type VerifyQuestionMutationBody = BodyType<VerifyQuestionInput>;
export type VerifyQuestionMutationError = ErrorType<unknown>;
/**
* @summary Queue a question for verification against the textbook
*/
export declare const useVerifyQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof verifyQuestion>>, TError, {
        data: BodyType<VerifyQuestionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof verifyQuestion>>, TError, {
    data: BodyType<VerifyQuestionInput>;
}, TContext>;
export declare const getListAIVerificationsUrl: (params?: ListAIVerificationsParams) => string;
/**
 * @summary List AI verifications (review queue)
 */
export declare const listAIVerifications: (params?: ListAIVerificationsParams, options?: Parameters<typeof customFetch>[1]) => Promise<AIVerificationPage>;
export declare const getListAIVerificationsQueryKey: (params?: ListAIVerificationsParams) => readonly ["/api/ai/verifications", ...ListAIVerificationsParams[]];
export declare const getListAIVerificationsQueryOptions: <TData = Awaited<ReturnType<typeof listAIVerifications>>, TError = ErrorType<unknown>>(params?: ListAIVerificationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAIVerifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAIVerifications>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAIVerificationsQueryResult = NonNullable<Awaited<ReturnType<typeof listAIVerifications>>>;
export type ListAIVerificationsQueryError = ErrorType<unknown>;
/**
 * @summary List AI verifications (review queue)
 */
export declare function useListAIVerifications<TData = Awaited<ReturnType<typeof listAIVerifications>>, TError = ErrorType<unknown>>(params?: ListAIVerificationsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAIVerifications>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAIVerificationUrl: (verificationId: number) => string;
/**
 * @summary Get a specific AI verification
 */
export declare const getAIVerification: (verificationId: number, options?: Parameters<typeof customFetch>[1]) => Promise<AIVerificationDetail>;
export declare const getGetAIVerificationQueryKey: (verificationId: number) => readonly [`/api/ai/verifications/${number}`];
export declare const getGetAIVerificationQueryOptions: <TData = Awaited<ReturnType<typeof getAIVerification>>, TError = ErrorType<unknown>>(verificationId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAIVerification>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAIVerification>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAIVerificationQueryResult = NonNullable<Awaited<ReturnType<typeof getAIVerification>>>;
export type GetAIVerificationQueryError = ErrorType<unknown>;
/**
 * @summary Get a specific AI verification
 */
export declare function useGetAIVerification<TData = Awaited<ReturnType<typeof getAIVerification>>, TError = ErrorType<unknown>>(verificationId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAIVerification>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAcceptAIVerificationUrl: (verificationId: number) => string;
/**
 * @summary Accept AI verification suggestion
 */
export declare const acceptAIVerification: (verificationId: number, options?: Parameters<typeof customFetch>[1]) => Promise<SuccessResponse>;
export declare const getAcceptAIVerificationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptAIVerification>>, TError, {
        verificationId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof acceptAIVerification>>, TError, {
    verificationId: number;
}, TContext>;
export type AcceptAIVerificationMutationResult = NonNullable<Awaited<ReturnType<typeof acceptAIVerification>>>;
export type AcceptAIVerificationMutationError = ErrorType<unknown>;
/**
* @summary Accept AI verification suggestion
*/
export declare const useAcceptAIVerification: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptAIVerification>>, TError, {
        verificationId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof acceptAIVerification>>, TError, {
    verificationId: number;
}, TContext>;
export declare const getDismissAIVerificationUrl: (verificationId: number) => string;
/**
 * @summary Dismiss AI verification (keep original answer)
 */
export declare const dismissAIVerification: (verificationId: number, options?: Parameters<typeof customFetch>[1]) => Promise<SuccessResponse>;
export declare const getDismissAIVerificationMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof dismissAIVerification>>, TError, {
        verificationId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof dismissAIVerification>>, TError, {
    verificationId: number;
}, TContext>;
export type DismissAIVerificationMutationResult = NonNullable<Awaited<ReturnType<typeof dismissAIVerification>>>;
export type DismissAIVerificationMutationError = ErrorType<unknown>;
/**
* @summary Dismiss AI verification (keep original answer)
*/
export declare const useDismissAIVerification: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof dismissAIVerification>>, TError, {
        verificationId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof dismissAIVerification>>, TError, {
    verificationId: number;
}, TContext>;
export declare const getGenerateAIQuestionsUrl: (chapterId: number) => string;
/**
 * @summary Generate AI questions from textbook pages
 */
export declare const generateAIQuestions: (chapterId: number, generateQuestionsInput: GenerateQuestionsInput, options?: Parameters<typeof customFetch>[1]) => Promise<GenerateQuestionsResponse>;
export declare const getGenerateAIQuestionsMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAIQuestions>>, TError, {
        chapterId: number;
        data: BodyType<GenerateQuestionsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof generateAIQuestions>>, TError, {
    chapterId: number;
    data: BodyType<GenerateQuestionsInput>;
}, TContext>;
export type GenerateAIQuestionsMutationResult = NonNullable<Awaited<ReturnType<typeof generateAIQuestions>>>;
export type GenerateAIQuestionsMutationBody = BodyType<GenerateQuestionsInput>;
export type GenerateAIQuestionsMutationError = ErrorType<unknown>;
/**
* @summary Generate AI questions from textbook pages
*/
export declare const useGenerateAIQuestions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof generateAIQuestions>>, TError, {
        chapterId: number;
        data: BodyType<GenerateQuestionsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof generateAIQuestions>>, TError, {
    chapterId: number;
    data: BodyType<GenerateQuestionsInput>;
}, TContext>;
export declare const getListAIGeneratedQuestionsUrl: (chapterId: number, params?: ListAIGeneratedQuestionsParams) => string;
/**
 * @summary List AI-generated question drafts for a chapter
 */
export declare const listAIGeneratedQuestions: (chapterId: number, params?: ListAIGeneratedQuestionsParams, options?: Parameters<typeof customFetch>[1]) => Promise<AIGeneratedQuestionPage>;
export declare const getListAIGeneratedQuestionsQueryKey: (chapterId: number, params?: ListAIGeneratedQuestionsParams) => readonly [`/api/chapters/${number}/ai-generated-questions`, ...ListAIGeneratedQuestionsParams[]];
export declare const getListAIGeneratedQuestionsQueryOptions: <TData = Awaited<ReturnType<typeof listAIGeneratedQuestions>>, TError = ErrorType<unknown>>(chapterId: number, params?: ListAIGeneratedQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAIGeneratedQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAIGeneratedQuestions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAIGeneratedQuestionsQueryResult = NonNullable<Awaited<ReturnType<typeof listAIGeneratedQuestions>>>;
export type ListAIGeneratedQuestionsQueryError = ErrorType<unknown>;
/**
 * @summary List AI-generated question drafts for a chapter
 */
export declare function useListAIGeneratedQuestions<TData = Awaited<ReturnType<typeof listAIGeneratedQuestions>>, TError = ErrorType<unknown>>(chapterId: number, params?: ListAIGeneratedQuestionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAIGeneratedQuestions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getGetAIGeneratedQuestionUrl: (questionId: number) => string;
/**
 * @summary Get a specific AI-generated question draft
 */
export declare const getAIGeneratedQuestion: (questionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<AIGeneratedQuestion>;
export declare const getGetAIGeneratedQuestionQueryKey: (questionId: number) => readonly [`/api/ai-generated-questions/${number}`];
export declare const getGetAIGeneratedQuestionQueryOptions: <TData = Awaited<ReturnType<typeof getAIGeneratedQuestion>>, TError = ErrorType<unknown>>(questionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAIGeneratedQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAIGeneratedQuestion>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAIGeneratedQuestionQueryResult = NonNullable<Awaited<ReturnType<typeof getAIGeneratedQuestion>>>;
export type GetAIGeneratedQuestionQueryError = ErrorType<unknown>;
/**
 * @summary Get a specific AI-generated question draft
 */
export declare function useGetAIGeneratedQuestion<TData = Awaited<ReturnType<typeof getAIGeneratedQuestion>>, TError = ErrorType<unknown>>(questionId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAIGeneratedQuestion>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getApproveAIGeneratedQuestionUrl: (questionId: number) => string;
/**
 * @summary Approve and save AI-generated question as real question
 */
export declare const approveAIGeneratedQuestion: (questionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<Question>;
export declare const getApproveAIGeneratedQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof approveAIGeneratedQuestion>>, TError, {
        questionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof approveAIGeneratedQuestion>>, TError, {
    questionId: number;
}, TContext>;
export type ApproveAIGeneratedQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof approveAIGeneratedQuestion>>>;
export type ApproveAIGeneratedQuestionMutationError = ErrorType<unknown>;
/**
* @summary Approve and save AI-generated question as real question
*/
export declare const useApproveAIGeneratedQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof approveAIGeneratedQuestion>>, TError, {
        questionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof approveAIGeneratedQuestion>>, TError, {
    questionId: number;
}, TContext>;
export declare const getDismissAIGeneratedQuestionUrl: (questionId: number) => string;
/**
 * @summary Dismiss AI-generated question draft
 */
export declare const dismissAIGeneratedQuestion: (questionId: number, options?: Parameters<typeof customFetch>[1]) => Promise<SuccessResponse>;
export declare const getDismissAIGeneratedQuestionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof dismissAIGeneratedQuestion>>, TError, {
        questionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof dismissAIGeneratedQuestion>>, TError, {
    questionId: number;
}, TContext>;
export type DismissAIGeneratedQuestionMutationResult = NonNullable<Awaited<ReturnType<typeof dismissAIGeneratedQuestion>>>;
export type DismissAIGeneratedQuestionMutationError = ErrorType<unknown>;
/**
* @summary Dismiss AI-generated question draft
*/
export declare const useDismissAIGeneratedQuestion: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof dismissAIGeneratedQuestion>>, TError, {
        questionId: number;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof dismissAIGeneratedQuestion>>, TError, {
    questionId: number;
}, TContext>;
export declare const getAiGradeAnswerUrl: (attemptId: number, answerId: number) => string;
/**
 * @summary Get AI grading suggestion for a written answer
 */
export declare const aiGradeAnswer: (attemptId: number, answerId: number, aIGradeAnswerInput: AIGradeAnswerInput, options?: Parameters<typeof customFetch>[1]) => Promise<AIGradeResponse>;
export declare const getAiGradeAnswerMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof aiGradeAnswer>>, TError, {
        attemptId: number;
        answerId: number;
        data: BodyType<AIGradeAnswerInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof aiGradeAnswer>>, TError, {
    attemptId: number;
    answerId: number;
    data: BodyType<AIGradeAnswerInput>;
}, TContext>;
export type AiGradeAnswerMutationResult = NonNullable<Awaited<ReturnType<typeof aiGradeAnswer>>>;
export type AiGradeAnswerMutationBody = BodyType<AIGradeAnswerInput>;
export type AiGradeAnswerMutationError = ErrorType<unknown>;
/**
* @summary Get AI grading suggestion for a written answer
*/
export declare const useAiGradeAnswer: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof aiGradeAnswer>>, TError, {
        attemptId: number;
        answerId: number;
        data: BodyType<AIGradeAnswerInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof aiGradeAnswer>>, TError, {
    attemptId: number;
    answerId: number;
    data: BodyType<AIGradeAnswerInput>;
}, TContext>;
export declare const getListAIChatSessionsUrl: (params?: ListAIChatSessionsParams) => string;
/**
 * @summary List user's AI chat sessions
 */
export declare const listAIChatSessions: (params?: ListAIChatSessionsParams, options?: Parameters<typeof customFetch>[1]) => Promise<AIChatSessionPage>;
export declare const getListAIChatSessionsQueryKey: (params?: ListAIChatSessionsParams) => readonly ["/api/ai/chat/sessions", ...ListAIChatSessionsParams[]];
export declare const getListAIChatSessionsQueryOptions: <TData = Awaited<ReturnType<typeof listAIChatSessions>>, TError = ErrorType<unknown>>(params?: ListAIChatSessionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAIChatSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listAIChatSessions>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListAIChatSessionsQueryResult = NonNullable<Awaited<ReturnType<typeof listAIChatSessions>>>;
export type ListAIChatSessionsQueryError = ErrorType<unknown>;
/**
 * @summary List user's AI chat sessions
 */
export declare function useListAIChatSessions<TData = Awaited<ReturnType<typeof listAIChatSessions>>, TError = ErrorType<unknown>>(params?: ListAIChatSessionsParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listAIChatSessions>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getCreateAIChatSessionUrl: () => string;
/**
 * @summary Create a new AI chat session
 */
export declare const createAIChatSession: (createAIChatSessionInput: CreateAIChatSessionInput, options?: Parameters<typeof customFetch>[1]) => Promise<AIChatSession>;
export declare const getCreateAIChatSessionMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAIChatSession>>, TError, {
        data: BodyType<CreateAIChatSessionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof createAIChatSession>>, TError, {
    data: BodyType<CreateAIChatSessionInput>;
}, TContext>;
export type CreateAIChatSessionMutationResult = NonNullable<Awaited<ReturnType<typeof createAIChatSession>>>;
export type CreateAIChatSessionMutationBody = BodyType<CreateAIChatSessionInput>;
export type CreateAIChatSessionMutationError = ErrorType<unknown>;
/**
* @summary Create a new AI chat session
*/
export declare const useCreateAIChatSession: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof createAIChatSession>>, TError, {
        data: BodyType<CreateAIChatSessionInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof createAIChatSession>>, TError, {
    data: BodyType<CreateAIChatSessionInput>;
}, TContext>;
export declare const getGetAIChatSessionUrl: (sessionId: number, params?: GetAIChatSessionParams) => string;
/**
 * @summary Get an AI chat session with messages
 */
export declare const getAIChatSession: (sessionId: number, params?: GetAIChatSessionParams, options?: Parameters<typeof customFetch>[1]) => Promise<AIChatSessionWithMessages>;
export declare const getGetAIChatSessionQueryKey: (sessionId: number, params?: GetAIChatSessionParams) => readonly [`/api/ai/chat/sessions/${number}`, ...GetAIChatSessionParams[]];
export declare const getGetAIChatSessionQueryOptions: <TData = Awaited<ReturnType<typeof getAIChatSession>>, TError = ErrorType<unknown>>(sessionId: number, params?: GetAIChatSessionParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAIChatSession>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getAIChatSession>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetAIChatSessionQueryResult = NonNullable<Awaited<ReturnType<typeof getAIChatSession>>>;
export type GetAIChatSessionQueryError = ErrorType<unknown>;
/**
 * @summary Get an AI chat session with messages
 */
export declare function useGetAIChatSession<TData = Awaited<ReturnType<typeof getAIChatSession>>, TError = ErrorType<unknown>>(sessionId: number, params?: GetAIChatSessionParams, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getAIChatSession>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getSendAIChatMessageUrl: (sessionId: number) => string;
/**
 * @summary Send a message in an AI chat session
 */
export declare const sendAIChatMessage: (sessionId: number, sendAIChatMessageInput: SendAIChatMessageInput, options?: Parameters<typeof customFetch>[1]) => Promise<SendAIChatMessageResponse>;
export declare const getSendAIChatMessageMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendAIChatMessage>>, TError, {
        sessionId: number;
        data: BodyType<SendAIChatMessageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof sendAIChatMessage>>, TError, {
    sessionId: number;
    data: BodyType<SendAIChatMessageInput>;
}, TContext>;
export type SendAIChatMessageMutationResult = NonNullable<Awaited<ReturnType<typeof sendAIChatMessage>>>;
export type SendAIChatMessageMutationBody = BodyType<SendAIChatMessageInput>;
export type SendAIChatMessageMutationError = ErrorType<unknown>;
/**
* @summary Send a message in an AI chat session
*/
export declare const useSendAIChatMessage: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof sendAIChatMessage>>, TError, {
        sessionId: number;
        data: BodyType<SendAIChatMessageInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof sendAIChatMessage>>, TError, {
    sessionId: number;
    data: BodyType<SendAIChatMessageInput>;
}, TContext>;
export declare const getListSubjectAssetsUrl: (subjectId: number) => string;
/**
 * @summary List stored file assets for a subject
 */
export declare const listSubjectAssets: (subjectId: number, options?: Parameters<typeof customFetch>[1]) => Promise<FileAssetListResponse>;
export declare const getListSubjectAssetsQueryKey: (subjectId: number) => readonly [`/api/books/${number}/assets`];
export declare const getListSubjectAssetsQueryOptions: <TData = Awaited<ReturnType<typeof listSubjectAssets>>, TError = ErrorType<void>>(subjectId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubjectAssets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof listSubjectAssets>>, TError, TData> & {
    queryKey: QueryKey;
};
export type ListSubjectAssetsQueryResult = NonNullable<Awaited<ReturnType<typeof listSubjectAssets>>>;
export type ListSubjectAssetsQueryError = ErrorType<void>;
/**
 * @summary List stored file assets for a subject
 */
export declare function useListSubjectAssets<TData = Awaited<ReturnType<typeof listSubjectAssets>>, TError = ErrorType<void>>(subjectId: number, options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof listSubjectAssets>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export declare const getAnswerFromBookUrl: (subjectId: number) => string;
/**
 * @summary Answer a question using the subject's textbook
 */
export declare const answerFromBook: (subjectId: number, answerFromBookInput: AnswerFromBookInput, options?: Parameters<typeof customFetch>[1]) => Promise<AnswerFromBookResponse>;
export declare const getAnswerFromBookMutationOptions: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof answerFromBook>>, TError, {
        subjectId: number;
        data: BodyType<AnswerFromBookInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof answerFromBook>>, TError, {
    subjectId: number;
    data: BodyType<AnswerFromBookInput>;
}, TContext>;
export type AnswerFromBookMutationResult = NonNullable<Awaited<ReturnType<typeof answerFromBook>>>;
export type AnswerFromBookMutationBody = BodyType<AnswerFromBookInput>;
export type AnswerFromBookMutationError = ErrorType<void>;
/**
* @summary Answer a question using the subject's textbook
*/
export declare const useAnswerFromBook: <TError = ErrorType<void>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof answerFromBook>>, TError, {
        subjectId: number;
        data: BodyType<AnswerFromBookInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof answerFromBook>>, TError, {
    subjectId: number;
    data: BodyType<AnswerFromBookInput>;
}, TContext>;
export {};
//# sourceMappingURL=api.d.ts.map