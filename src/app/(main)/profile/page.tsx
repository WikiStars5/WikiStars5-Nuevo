import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getUserById } from "@/lib/data";
import { Flame, Medal, MessageSquare, TrendingUp } from "lucide-react";

export default async function ProfilePage() {
    const user = await getUserById('user-1');

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
                                    <AvatarImage src={user?.avatarUrl} alt={user?.name} data-ai-hint={user?.avatarHint} />
                                    <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Button variant="outline">Change Avatar</Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input id="username" defaultValue={user?.name} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" type="email" defaultValue={user?.email} disabled />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Country</Label>
                                <Select defaultValue={user?.country}>
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
                                <span className="font-bold text-lg">15 Days</span>
                            </div>
                            <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <MessageSquare className="h-6 w-6 text-primary" />
                                    <span className="font-medium">Total Comments</span>
                                </div>
                                <span className="font-bold text-lg">42</span>
                            </div>
                             <Separator />
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-6 w-6 text-green-500" />
                                    <span className="font-medium">Total Votes</span>
                                </div>
                                <span className="font-bold text-lg">112</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Achievements</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            <div className="flex flex-col items-center text-center gap-2 p-2 rounded-md bg-muted" title="First Comment">
                                <Medal className="h-8 w-8 text-yellow-500"/>
                                <span className="text-xs font-medium">First Comment</span>
                            </div>
                            <div className="flex flex-col items-center text-center gap-2 p-2 rounded-md bg-muted" title="First Vote">
                                <Medal className="h-8 w-8 text-yellow-500"/>
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
