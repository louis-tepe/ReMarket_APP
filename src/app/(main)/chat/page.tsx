import ChatInterface from "@/components/features/chat/chat-interface";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

/**
 * ChatPage: Provides a user interface for interacting with the Gemini AI.
 * Wraps the ChatInterface component within a styled Card layout.
 */
export default function ChatPage() {
    return (
        <div className="container mx-auto py-8 flex flex-col items-center">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Chat avec Gemini</CardTitle>
                    <CardDescription className="text-lg text-muted-foreground">
                        Interagissez avec l&apos;IA Gemini 2.5 Flash.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ChatInterface />
                </CardContent>
            </Card>
        </div>
    );
} 