import ChatInterface from "@/components/features/chat/chat-interface";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function ChatPage() {
    return (
        <div className="container mx-auto py-8 flex flex-col items-center">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Chat avec Gemini</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Interagissez avec l'IA Gemini 2.5 Flash.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChatInterface />
                </CardContent>
            </Card>
        </div>
    );
} 