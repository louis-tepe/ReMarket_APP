'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronRight, Home, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { LeanBrand } from '@/types/brand';
import type { LeanCategory } from '@/types/category';

interface FiltersSidebarProps {
    allRootCategories: LeanCategory[];
    currentCategory: LeanCategory | null;
    currentCategoryChildren: LeanCategory[];
    breadcrumbs: LeanCategory[];
    allBrands: LeanBrand[];
    activeBrandSlugs?: string[];
    onFiltersChange: (filters: { categorySlug?: string; brandSlugs?: string[]; searchQuery?: string }) => void;
    basePath?: string;
}

export default function FiltersSidebar({
    allRootCategories,
    currentCategory,
    currentCategoryChildren,
    breadcrumbs,
    allBrands,
    activeBrandSlugs,
    onFiltersChange,
    basePath = '/categories',
}: FiltersSidebarProps) {
    const [selectedBrandSlugs, setSelectedBrandSlugs] = useState<string[]>(activeBrandSlugs || []);

    useEffect(() => {
        setSelectedBrandSlugs(activeBrandSlugs || []);
    }, [activeBrandSlugs]);

    const handleCategoryClick = useCallback((slug: string) => {
        onFiltersChange({ categorySlug: slug, brandSlugs: [] });
    }, [onFiltersChange]);

    const handleBrandChange = (brandSlug: string, checked: boolean | string) => {
        const newBrandSlugs = checked
            ? [...selectedBrandSlugs, brandSlug]
            : selectedBrandSlugs.filter(slug => slug !== brandSlug);
        setSelectedBrandSlugs(newBrandSlugs);
        onFiltersChange({ categorySlug: currentCategory?.slug, brandSlugs: newBrandSlugs.length > 0 ? newBrandSlugs : undefined });
    };

    const clearCategoryFilter = () => {
        onFiltersChange({ categorySlug: undefined, brandSlugs: undefined, searchQuery: '' });
    };

    const renderCategoryLink = (category: LeanCategory) => (
        <Link
            key={category._id}
            href={`${basePath}/${breadcrumbs.map(b => b.slug).join('/')}/${category.slug}`}
            onClick={() => handleCategoryClick(category.slug)}
            className={cn(
                "flex items-center justify-between w-full text-left p-2 rounded-md hover:bg-accent",
                currentCategory?.slug === category.slug ? "font-semibold text-primary bg-primary/10" : "text-foreground"
            )}
        >
            <span>{category.name}</span>
            <ChevronRight className="h-4 w-4" />
        </Link>
    );
    
    return (
        <aside className="md:w-72 lg:w-80 border-r space-y-3 py-2 bg-background h-full">
            <div className="flex justify-between items-center px-3 pt-1 pb-2">
                <h2 className="text-lg font-semibold tracking-tight">Filtres</h2>
            </div>
            <ScrollArea className="h-[calc(100%-3.5rem)] px-2">
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2 px-1">
                            <h3 className="text-sm font-medium tracking-tight">Catégories</h3>
                            {currentCategory && (
                                <Button variant="ghost" size="sm" onClick={clearCategoryFilter} className="h-auto p-0.5 text-xs text-muted-foreground hover:text-destructive">
                                    <X className="h-3 w-3 mr-0.5" /> Effacer
                                </Button>
                            )}
                        </div>

                        {/* Breadcrumbs */}
                        <div className="mb-3 space-y-1">
                            <Link href="/categories" onClick={() => onFiltersChange({categorySlug: undefined})} className={cn("flex items-center text-sm p-2 rounded-md", !currentCategory ? 'bg-accent font-semibold' : 'hover:bg-accent')}>
                                <Home className="h-4 w-4 mr-2" /> Toutes les catégories
                            </Link>
                            {breadcrumbs.map((crumb, index) => (
                                <div key={crumb._id} className="flex items-center">
                                    <span style={{marginLeft: `${index * 10}px`}} className="mr-1">
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                    <Link href={`${basePath}/${breadcrumbs.slice(0, index + 1).map(c => c.slug).join('/')}`} onClick={() => handleCategoryClick(crumb.slug)} className="text-sm p-1 rounded-md hover:bg-accent">
                                        {crumb.name}
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {/* Current Category Title */}
                        {currentCategory && (
                             <div className="px-2 py-2 mb-2 bg-secondary/60 rounded-md">
                                <h4 className="font-semibold">{currentCategory.name}</h4>
                            </div>
                        )}
                       
                        {/* Child categories or Root categories */}
                        <div className="space-y-1">
                            {(currentCategoryChildren.length > 0 ? currentCategoryChildren : allRootCategories).map(renderCategoryLink)}
                        </div>
                    </div>

                    {allBrands.length > 0 && (
                         <Accordion type="single" collapsible className="w-full" defaultValue="item-brands">
                            <AccordionItem value="item-brands">
                                <AccordionTrigger className="text-sm font-medium hover:no-underline">
                                    Marques ({selectedBrandSlugs.length > 0 ? `${selectedBrandSlugs.length} sel.` : allBrands.length})
                                </AccordionTrigger>
                                <AccordionContent className="text-sm">
                                    <ScrollArea className="max-h-52">
                                    <div className="space-y-1 pr-3">
                                        {allBrands.map(brand => (
                                            <div key={brand._id} className="flex items-center space-x-2 py-0.5 px-1 rounded-md hover:bg-accent">
                                                <Checkbox
                                                    id={`brand-${brand.slug}`}
                                                    checked={selectedBrandSlugs.includes(brand.slug)}
                                                    onCheckedChange={(checked) => handleBrandChange(brand.slug, checked)}
                                                />
                                                <label htmlFor={`brand-${brand.slug}`} className="text-xs font-normal leading-tight flex-grow truncate cursor-pointer">
                                                    {brand.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                    </ScrollArea>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
} 