import { getTopStreaksByFigureId, getUserById } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Flame } from 'lucide-react';

export default async function TopStreaks({ figureId }: { figureId: string }) {
  const streaks = await getTopStreaksByFigureId(figureId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Comment Streaks</CardTitle>
        <CardDescription>Users with the longest daily comment streaks for this figure.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Streak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streaks.map(async (streak, index) => {
              const user = await getUserById(streak.userId);
              return (
                <TableRow key={streak.userId}>
                  <TableCell className="font-medium">#{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                         <AvatarImage src={user?.avatarUrl} alt={user?.name} data-ai-hint={user?.avatarHint} />
                         <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{user?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5 font-bold">
                      <Flame className="h-5 w-5 text-orange-500" />
                      {streak.streak} days
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
             {streaks.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                        No active streaks yet.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
