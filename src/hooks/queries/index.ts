// Core data queries - essential, loaded immediately
export { useDivisionsQuery, useSubjectsQuery, useFacultyQuery, useRoomsQuery, useTimetableQuery, useChallengesQuery, useAnnouncementsQuery, useStudentChallengesQuery } from './useCoreDataQuery';

// Students query
export { useStudentsQuery, useAddStudentMutation, useRemoveStudentMutation } from './useStudentsQuery';

// Attendance queries - loaded on-demand
export { useAttendanceQuery, useTodayAttendanceQuery, useHistoricalAttendanceQuery, useStudentAttendanceQuery, useMarkAttendanceMutation, useBulkMarkAttendanceMutation } from './useAttendanceQuery';

// Fees queries - loaded on-demand
export { useFeesQuery, useClassFeesQuery, useAddFeeMutation, useUpdateFeeStatusMutation, useDeleteFeeMutation, useUpdateClassFeeMutation } from './useFeesQuery';

// Tests queries - loaded on-demand
export { useWeeklyTestsQuery, useTestResultsQuery, useAddWeeklyTestMutation, useDeleteWeeklyTestMutation, useAddTestResultMutation, useAddTestResultsBatchMutation } from './useTestsQuery';
