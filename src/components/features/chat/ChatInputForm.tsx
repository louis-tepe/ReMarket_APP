import React from 'react';
import Image from 'next/image';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Paperclip, Send, Loader2, X } from "lucide-react";

interface ChatInputFormProps {
    input: string;
    onInputChange: (value: string) => void;
    selectedImage: File | null;
    imagePreview: string | null;
    onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveImage: () => void;
    onSubmit: (e?: React.FormEvent<HTMLFormElement>) => Promise<void>;
    isLoading: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ChatInputForm: React.FC<ChatInputFormProps> = ({
    input, onInputChange, selectedImage, imagePreview, onImageChange, onRemoveImage, onSubmit, isLoading, fileInputRef
}) => {
    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <>
            {imagePreview && (
                <div className="mb-2 p-2 border rounded-md relative max-w-xs mx-auto">
                    <Image
                        src={imagePreview}
                        alt="Aperçu"
                        width={160}
                        height={160}
                        className="max-h-40 rounded-md object-contain"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-7 w-7 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full p-1"
                        onClick={onRemoveImage}
                        aria-label="Supprimer l'image"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            )}
            <form onSubmit={onSubmit} className="flex items-center gap-2 p-2 border-t">
                <Button type="button" variant="outline" size="icon" onClick={triggerFileInput} disabled={isLoading} className="shrink-0">
                    <Paperclip className="h-5 w-5" />
                    <span className="sr-only">Joindre un fichier</span>
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onImageChange}
                    accept="image/png, image/jpeg, image/webp, image/heic, image/heif"
                    className="hidden"
                    disabled={isLoading}
                />
                <Input
                    type="text"
                    value={input}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder={selectedImage ? `Commentaire pour ${selectedImage.name}...` : "Envoyer un message..."}
                    className="flex-grow"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            onSubmit();
                        }
                    }}
                />
                <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && !selectedImage)} className="shrink-0">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    <span className="sr-only">Envoyer</span>
                </Button>
            </form>
        </>
    );
}; 