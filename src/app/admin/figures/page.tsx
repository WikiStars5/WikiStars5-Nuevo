import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getFigures } from '@/lib/data';
import Image from 'next/image';

export default async function AdminFiguresPage() {
  const figures = await getFigures();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Figures</CardTitle>
                <CardDescription>Manage public figure profiles.</CardDescription>
            </div>
            <div className="flex gap-2">
                 <Button variant="destructive">Delete All</Button>
                 <Button>Add Figure</Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Nationality</TableHead>
              <TableHead className="hidden md:table-cell">Tags</TableHead>
              <TableHead className="hidden md:table-cell">Featured</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {figures.map((figure) => (
              <TableRow key={figure.id}>
                <TableCell className="hidden sm:table-cell">
                  <Image
                    alt={figure.name}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={figure.imageUrl}
                    width="64"
                    data-ai-hint={figure.imageHint}
                  />
                </TableCell>
                <TableCell className="font-medium">{figure.name}</TableCell>
                <TableCell>{figure.nationality}</TableCell>
                <TableCell className="hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                        {figure.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                    </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={figure.isFeatured ? 'default' : 'secondary'}>
                    {figure.isFeatured ? 'Yes' : 'No'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
