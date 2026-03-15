
'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import UserSavedThoughts from './user-saved-thoughts';
import UserSavedStarPosts from './user-saved-starposts';
import { Cloud, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface UserSavedContentProps {
    userId: string;
}

export default function UserSavedContent({ userId }: UserSavedContentProps) {
    const { theme } = useTheme();

    return (
        <Tabs defaultValue="thoughts" className="w-full">
            <div className="flex justify-center mb-6">
                <TabsList className={cn("grid w-full max-w-[400px] grid-cols-2", (theme === 'dark' || theme === 'army') && "bg-black")}>
                    <TabsTrigger value="thoughts" className="text-xs gap-2">
                        <Cloud className="h-3 w-3" /> Pensamientos
                    </TabsTrigger>
                    <TabsTrigger value="starposts" className="text-xs gap-2">
                        <MessageSquare className="h-3 w-3" /> Reseñas
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="thoughts">
                <UserSavedThoughts userId={userId} />
            </TabsContent>
            
            <TabsContent value="starposts">
                <UserSavedStarPosts userId={userId} />
            </TabsContent>
        </Tabs>
    );
}
