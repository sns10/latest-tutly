// Core data queries - essential, loaded immediately
export { useDivisionsQuery, useSubjectsQuery, useFacultyQuery, useRoomsQuery, useTimetableQuery, useChallengesQuery, useAnnouncementsQuery, useStudentChallengesQuery } from './useCoreDataQuery';

// Students query
export { useStudentsQuery, useAddStudentMutation, useRemoveStudentMutation } from './useStudentsQuery';

// Student mutations
export { useUpdateStudentMutation, useAssignStudentEmailMutation, useAssignTeamMutation, useUpdateStudentDivisionMutation } from './useStudentMutations';

// XP mutations
export { useAddXpMutation, useReduceXpMutation, useAwardXpMutation, useBuyRewardMutation, useUseRewardMutation } from './useXpMutations';

// Attendance queries - loaded on-demand
export { useAttendanceQuery, useTodayAttendanceQuery, useHistoricalAttendanceQuery, useReportAttendanceQuery, useStudentAttendanceQuery, useMarkAttendanceMutation, useBulkMarkAttendanceMutation } from './useAttendanceQuery';

// Fees queries - loaded on-demand
export { useFeesQuery, useClassFeesQuery, useAddFeeMutation, useUpdateFeeStatusMutation, useDeleteFeeMutation, useUpdateClassFeeMutation, usePaymentsQuery, useRecordPaymentMutation } from './useFeesQuery';

// Fees batch mutations
export { useAddFeesBatchMutation } from './useFeesMutations';

// Tests queries - loaded on-demand
export { useWeeklyTestsQuery, useTestResultsQuery, useAddWeeklyTestMutation, useDeleteWeeklyTestMutation, useAddTestResultMutation, useAddTestResultsBatchMutation } from './useTestsQuery';

// Challenge mutations
export { useAddChallengeMutation, useCompleteChallengeMutation } from './useChallengeMutations';

// Announcement mutations
export { useAddAnnouncementMutation } from './useAnnouncementMutations';

// Faculty mutations
export { useAddFacultyMutation, useUpdateFacultyMutation, useDeleteFacultyMutation } from './useFacultyMutations';

// Subject mutations
export { useAddSubjectMutation, useUpdateSubjectMutation, useDeleteSubjectMutation } from './useSubjectMutations';

// Timetable mutations
export { useAddTimetableEntryMutation, useUpdateTimetableEntryMutation, useDeleteTimetableEntryMutation } from './useTimetableMutations';

// Division mutations
export { useAddDivisionMutation, useUpdateDivisionMutation, useDeleteDivisionMutation } from './useDivisionMutations';

// Room mutations
export { useAddRoomMutation, useUpdateRoomMutation, useDeleteRoomMutation } from './useRoomMutations';
