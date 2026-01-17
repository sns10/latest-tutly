import { useMemo } from 'react';
import { Student } from '@/types';

export interface BirthdayStudent extends Student {
  age: number | null;
  daysUntilBirthday: number;
}

export function useBirthdayStudents(students: Student[]) {
  const today = useMemo(() => new Date(), []);

  const isBirthdayToday = (dateOfBirth: string | undefined): boolean => {
    if (!dateOfBirth) return false;
    const dob = new Date(dateOfBirth);
    return today.getMonth() === dob.getMonth() && today.getDate() === dob.getDate();
  };

  const calculateAge = (dateOfBirth: string | undefined): number | null => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const getDaysUntilBirthday = (dateOfBirth: string | undefined): number => {
    if (!dateOfBirth) return Infinity;
    const dob = new Date(dateOfBirth);
    const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    
    // If birthday has passed this year, calculate for next year
    if (thisYearBirthday < today && !isBirthdayToday(dateOfBirth)) {
      thisYearBirthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = thisYearBirthday.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const todaysBirthdays: BirthdayStudent[] = useMemo(() => {
    return students
      .filter(student => isBirthdayToday(student.dateOfBirth))
      .map(student => ({
        ...student,
        age: calculateAge(student.dateOfBirth),
        daysUntilBirthday: 0,
      }));
  }, [students, today]);

  const upcomingBirthdays: BirthdayStudent[] = useMemo(() => {
    return students
      .filter(student => {
        if (!student.dateOfBirth) return false;
        const days = getDaysUntilBirthday(student.dateOfBirth);
        return days > 0 && days <= 7;
      })
      .map(student => ({
        ...student,
        age: calculateAge(student.dateOfBirth),
        daysUntilBirthday: getDaysUntilBirthday(student.dateOfBirth),
      }))
      .sort((a, b) => a.daysUntilBirthday - b.daysUntilBirthday);
  }, [students, today]);

  return {
    todaysBirthdays,
    upcomingBirthdays,
    hasBirthdays: todaysBirthdays.length > 0,
    hasUpcoming: upcomingBirthdays.length > 0,
    isBirthdayToday,
    calculateAge,
  };
}
