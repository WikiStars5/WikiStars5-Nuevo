import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFigures, getUsers } from '@/lib/data';
import { Star, Users, Wrench, PlusCircle } from 'lucide-react';

export default async function AdminDashboard() {
  const figures = await getFigures();
  const users = await getUsers();

  const statCards = [
    {
      title: 'Total Figures',
      value: figures.length,
      icon: Star,
      description: 'Public figures in the database.',
    },
    {
      title: 'Registered Users',
      value: users.filter(u => u.role !== 'guest').length,
      icon: Users,
      description: 'Total user accounts.',
    },
  ];

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Perform common tasks quickly.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button asChild variant="outline">
              <Link href="/admin/figures">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Figure
              </Link>
            </Button>
            <Button asChild variant="outline">
               <Link href="/signup">
                <Users className="mr-2 h-4 w-4" /> Create New User
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Tools</CardTitle>
            <CardDescription>System-wide maintenance actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full">
              <Wrench className="mr-2 h-4 w-4" />
              Fix Image URLs
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
