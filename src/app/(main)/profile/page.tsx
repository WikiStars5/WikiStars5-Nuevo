
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { Flame, Medal, MessageSquare, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { collection, query, where } from "firebase/firestore";

export default function ProfilePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const commentsQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'comments'), where('userId', '==', user.uid));
    }, [firestore, user]);

    const { data: comments, isLoading: isLoadingComments } = useCollection(commentsQuery);

    if (isUserLoading) {
      return (
         <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
             <header className="mb-8">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-5 w-1/2 mt-2" />
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-4">
                    <Skeleton className="h-64 w-full" />
                </div>
                <div className="space-y-8">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
         </div>
      )
    }

    if (!user) {
        return (
             <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12 text-center">
                <h1 className="text-2xl font-bold">Please log in</h1>
                <p className="text-muted-foreground">You need to be logged in to view your profile.</p>
            </div>
        )
    }

    const getAvatarFallback = () => {
        if (user?.isAnonymous) return 'G';
        return user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U';
    }

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
             <header className="mb-8">
                <h1 className="text-4xl font-bold tracking-tight font-headline">My Profile</h1>
                <p className="text-muted-foreground mt-2">View your activity and manage your account settings.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                            <CardDescription>Edit your personal details here.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User Avatar'} />
                                    <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                                </Avatar>
                                <Button variant="outline">Change Avatar</Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input id="username" defaultValue={user?.displayName || ''} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" defaultValue={user?.email || ''} disabled />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Select>
                                    <SelectTrigger id="country">
                                        <SelectValue placeholder="Select your country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USA">United States</SelectItem>
                                        <SelectItem value="Canada">Canada</SelectItem>
                                        <SelectItem value="Germany">Germany</SelectItem>
                                        <SelectItem value="Australia">Australia</SelectItem>
                                        <SelectItem value="France">France</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button>Save Changes</Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>Activity Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Flame className="h-6 w-6 text-orange-500" />
                                    <span className="font-medium">Longest Streak</span>
                                </div>
                                <span className="font-bold text-lg">0 Days</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-6 w-6 text-primary" />
                                    <span className="font-medium">Total Comments</span>
                                </div>
                                {isLoadingComments ? (
                                    <Skeleton className="h-6 w-8" />
                                ) : (
                                    <span className="font-bold text-lg">{comments?.length ?? 0}</span>
                                )}
                            </div>
                             <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-6 w-6 text-green-500" />
                                    <span className="font-medium">Total Votes</span>
                                </div>
                                <span className="font-bold text-lg">0</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Achievements</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            <div className="flex flex-col items-center text-center gap-2 p-2 rounded-md bg-muted opacity-50" title="First Comment (Locked)">
                                <Medal className="h-8 w-8 text-muted-foreground"/>
                                <span className="text-xs font-medium">First Comment</span>
                            </div>
                            <div className="flex flex-col items-center text-center gap-2 p-2 rounded-md bg-muted opacity-50" title="First Vote (Locked)">
                                <Medal className="h-8 w-8 text-muted-foreground"/>
                                <span className="text-xs font-medium">First Vote</span>
                            </div>
                            <div className="flex flex-col items-center text-center gap-2 p-2 rounded-md bg-muted opacity-50" title="10 Day Streak (Locked)">
                                <Medal className="h-8 w-8 text-muted-foreground"/>
                                <span className="text-xs font-medium">10 Day Streak</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
