
import { useMemo } from "react";
import { WeeklyTest, StudentTestResult, Student } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Award, Star } from "lucide-react";

interface SmartboardViewProps {
  tests: WeeklyTest[];
  testResults: StudentTestResult[];
  students: Student[];
}

export function SmartboardView({ tests, testResults, students }: SmartboardViewProps) {
  const smartboardData = useMemo(() => {
    if (tests.length === 0) return null;

    const latestTest = tests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const latestResults = testResults.filter(r => r.testId === latestTest.id);

    // Top 5 scorers for latest test
    const topScorers = latestResults
      .map(result => {
        const student = students.find(s => s.id === result.studentId);
        const percentage = (result.marks / latestTest.maxMarks) * 100;
        return { student, result, percentage };
      })
      .filter(item => item.student)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    // Most improved student (compare with previous test)
    const previousTest = tests
      .filter(t => new Date(t.date) < new Date(latestTest.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    let mostImproved = null;
    if (previousTest) {
      const previousResults = testResults.filter(r => r.testId === previousTest.id);
      const improvements = latestResults
        .map(current => {
          const previous = previousResults.find(p => p.studentId === current.studentId);
          if (!previous) return null;
          
          const currentPercentage = (current.marks / latestTest.maxMarks) * 100;
          const previousPercentage = (previous.marks / previousTest.maxMarks) * 100;
          const improvement = currentPercentage - previousPercentage;
          
          return {
            student: students.find(s => s.id === current.studentId),
            improvement,
            currentPercentage,
            previousPercentage
          };
        })
        .filter(item => item && item.improvement > 0)
        .sort((a, b) => b!.improvement - a!.improvement);

      mostImproved = improvements[0] || null;
    }

    return {
      latestTest,
      topScorers,
      mostImproved
    };
  }, [tests, testResults, students]);

  if (!smartboardData) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No test results yet</h3>
          <p className="text-muted-foreground">Create and complete tests to see the smartboard view</p>
        </CardContent>
      </Card>
    );
  }

  const { latestTest, topScorers, mostImproved } = smartboardData;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-display text-primary mb-2">🏆 SMARTBOARD 🏆</h2>
        <p className="text-lg text-muted-foreground">Latest Test: {latestTest.name}</p>
        <Badge variant="outline" className="mt-2">{latestTest.subject}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top 5 Scorers */}
        <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Trophy className="h-6 w-6 text-yellow-500" />
              Top 5 Scorers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topScorers.map((item, index) => (
                <div key={item.student!.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/50">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={item.student!.avatar} />
                      <AvatarFallback>{item.student!.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{item.student!.name}</div>
                    <div className="text-sm text-muted-foreground">{item.student!.class} Grade</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {Math.round(item.percentage)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.result.marks}/{latestTest.maxMarks}
                    </div>
                  </div>
                  {index === 0 && <Star className="h-5 w-5 text-yellow-500" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Improved */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="h-6 w-6 text-green-500" />
              Most Improved
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mostImproved ? (
              <div className="text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-20 w-20 mx-auto border-4 border-green-300">
                    <AvatarImage src={mostImproved.student!.avatar} />
                    <AvatarFallback className="text-2xl">{mostImproved.student!.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-2">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{mostImproved.student!.name}</h3>
                  <p className="text-muted-foreground">{mostImproved.student!.class} Grade</p>
                </div>
                <div className="bg-white/50 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    +{Math.round(mostImproved.improvement)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    From {Math.round(mostImproved.previousPercentage)}% to {Math.round(mostImproved.currentPercentage)}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Need at least 2 tests to show improvement
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Class Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Class Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{topScorers.length}</div>
              <div className="text-sm text-muted-foreground">Students Completed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {topScorers.length > 0 ? Math.round(topScorers.reduce((sum, item) => sum + item.percentage, 0) / topScorers.length) : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Class Average</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {topScorers.filter(item => item.percentage >= 80).length}
              </div>
              <div className="text-sm text-muted-foreground">Students 80%+</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {mostImproved ? 1 : 0}
              </div>
              <div className="text-sm text-muted-foreground">Improved Students</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
