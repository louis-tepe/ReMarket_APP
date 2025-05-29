'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
// import { ICategory } from '@/models/CategoryModel'; // Remplacé par LeanCategory
// import { IBrand } from '@/models/BrandModel'; // Remplacé par LeanBrand
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Types } from 'mongoose'; // Importer Types pour ObjectId

// Définition d'un type "lean" pour les catégories
interface LeanCategory {
    _id: Types.ObjectId | string; // _id peut être string après serialisation
    name: string;
    slug: string;
    description?: string;
    depth: number;
    parent?: Types.ObjectId | string; // parent peut être string après serialisation
    isLeafNode: boolean;
    createdAt: Date | string; // Date peut devenir string
    updatedAt: Date | string;
}

// Définition d'un type "lean" pour les marques
interface LeanBrand {
    _id: Types.ObjectId | string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    categories?: (Types.ObjectId | string)[]; // Peut aussi être des strings après serialisation
    createdAt: Date | string;
    updatedAt: Date | string;
}

interface CategoryNode extends LeanCategory { // Utilise LeanCategory
    children: CategoryNode[];
}

interface FiltersSidebarProps {
    allCategories: LeanCategory[];
    allBrands: LeanBrand[];
    activeCategorySlug?: string;
    activeBrandSlugs?: string[];
    currentCategoryAncestors?: string[];
    onFiltersChange: (filters: { categorySlug?: string; brandSlugs?: string[]; searchQuery?: string }) => void;
    basePath?: string;
}

const BASE_CATEGORY_ITEM_PADDING_X = "px-2"; // Padding horizontal de base pour chaque item de catégorie
const INDENT_PER_DEPTH = 10; // Augmentation du padding-left (en px) par niveau de profondeur

export default function FiltersSidebar({
    allCategories,
    allBrands,
    activeCategorySlug,
    activeBrandSlugs,
    currentCategoryAncestors = [],
    onFiltersChange,
    basePath = '/categories',
}: FiltersSidebarProps) {
    const [selectedBrandSlugs, setSelectedBrandSlugs] = useState<string[]>(activeBrandSlugs || []);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setSelectedBrandSlugs(activeBrandSlugs || []);
    }, [activeBrandSlugs]);

    const categoriesTree = useMemo(() => buildCategoryTree(allCategories), [allCategories]);

    const findCategoryNodeById = useCallback((nodes: CategoryNode[], id: string): CategoryNode | null => {
        for (const node of nodes) {
            if (node._id.toString() === id) return node;
            const foundInChildren = findCategoryNodeById(node.children, id);
            if (foundInChildren) return foundInChildren;
        }
        return null;
    }, []);

    useEffect(() => {
        const newExpandedState: Record<string, boolean> = {};
        currentCategoryAncestors.forEach(ancestorId => {
            newExpandedState[ancestorId] = true;
        });
        const currentCat = allCategories.find(c => c.slug === activeCategorySlug);
        if (currentCat) {
            const currentCatNode = findCategoryNodeById(categoriesTree, currentCat._id.toString());
            if (currentCatNode?.children?.length) {
                newExpandedState[currentCat._id.toString()] = true;
            }
        }
        setExpandedCategories(newExpandedState);
    }, [activeCategorySlug, currentCategoryAncestors, allCategories, categoriesTree, findCategoryNodeById]);

    const handleCategoryClick = useCallback((categorySlug: string) => {
        onFiltersChange({ categorySlug, brandSlugs: [] });
    }, [onFiltersChange]);

    const handleBrandChange = (brandSlug: string, checked: boolean | string) => {
        const newBrandSlugs = checked
            ? [...selectedBrandSlugs, brandSlug]
            : selectedBrandSlugs.filter(slug => slug !== brandSlug);
        setSelectedBrandSlugs(newBrandSlugs);
        onFiltersChange({ categorySlug: activeCategorySlug, brandSlugs: newBrandSlugs.length > 0 ? newBrandSlugs : undefined });
    };

    const toggleManualExpansion = (categoryId: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const renderCategory = (category: CategoryNode, depth: number) => {
        const isSelected = activeCategorySlug === category.slug;
        const isAncestor = currentCategoryAncestors.includes(category._id.toString());
        const hasChildren = category.children?.length > 0;
        const isExplicitlyExpanded = !!expandedCategories[category._id.toString()];

        return (
            <div key={category._id.toString()} className="mb-0.5">
                <div
                    style={{ paddingLeft: `${depth * INDENT_PER_DEPTH}px` }}
                    className={cn(
                        "rounded-md",
                        (isSelected || isAncestor) && "bg-secondary/60"
                    )}
                >
                    <div className={cn(
                        "flex items-center justify-between group py-0.5",
                        BASE_CATEGORY_ITEM_PADDING_X
                    )}>
                        <Link
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            href={`${basePath}/${category.slug}` as any}
                            passHref
                            className="flex-grow min-w-0"
                            onClick={() => handleCategoryClick(category.slug)}
                        >
                            <div
                                className={cn(
                                    "justify-start text-left h-auto truncate hover:text-primary",
                                    isSelected && "font-semibold text-primary",
                                    isAncestor && !isSelected && "font-medium text-secondary-foreground/90"
                                )}
                            >
                                {category.name}
                            </div>
                        </Link>
                        {hasChildren && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0 p-1 ml-1"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleManualExpansion(category._id.toString());
                                }}
                            >
                                {isExplicitlyExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>
                {isExplicitlyExpanded && hasChildren && (
                    <div className="mt-0.5">
                        {category.children.map(child => renderCategory(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    const clearCategoryFilter = () => {
        // Réinitialise la catégorie, les marques ET la recherche
        onFiltersChange({ categorySlug: undefined, brandSlugs: undefined, searchQuery: '' });
        setSelectedBrandSlugs([]);
        setExpandedCategories({});
    }

    return (
        // Les classes de positionnement (fixed/sticky) et de visibilité sont gérées par la page parente
        <aside className={cn(
            "md:w-72 lg:w-80 border-r space-y-3 py-2 bg-background h-full", // Largeur réduite, padding interne de la sidebar ajusté
        )}>
            <div className="flex justify-between items-center px-3 pt-1 pb-2">
                <h2 className="text-lg font-semibold tracking-tight">Filtres</h2>
            </div>
            <ScrollArea className="h-[calc(100%-3.5rem)] px-1">
                <div className="space-y-4">
                    <div className="">
                        <div className="flex justify-between items-center mb-1 px-2">
                            <h3 className="text-sm font-medium tracking-tight">Catégories</h3>
                            {activeCategorySlug && (
                                <Button variant="ghost" size="sm" onClick={clearCategoryFilter} className="h-auto p-0.5 text-xs text-muted-foreground hover:text-destructive">
                                    <X className="h-3 w-3 mr-0.5" /> Effacer
                                </Button>
                            )}
                        </div>
                        {categoriesTree.map(category => renderCategory(category, 0))}
                    </div>

                    {allBrands && allBrands.length > 0 && (
                        <Accordion type="single" collapsible className="w-full px-1" defaultValue="item-brands">
                            <AccordionItem value="item-brands">
                                <AccordionTrigger className="text-sm font-medium px-1 py-1.5 hover:no-underline">
                                    Marques ({selectedBrandSlugs.length > 0 ? `${selectedBrandSlugs.length} sel.` : allBrands.length})
                                </AccordionTrigger>
                                <AccordionContent className="text-sm pl-1 pr-0.5">
                                    <div className="max-h-52 overflow-y-auto space-y-1">
                                        {allBrands.map(brand => (
                                            <div key={(brand._id as Types.ObjectId).toString()} className="flex items-center space-x-2 py-0.5 px-1 rounded-md hover:bg-accent">
                                                <Checkbox
                                                    id={`brand-${brand.slug}`}
                                                    checked={selectedBrandSlugs.includes(brand.slug)}
                                                    onCheckedChange={(checked) => handleBrandChange(brand.slug, checked)}
                                                    className=" shrink-0"
                                                />
                                                <label
                                                    htmlFor={`brand-${brand.slug}`}
                                                    className="text-xs font-normal leading-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-grow truncate cursor-pointer"
                                                >
                                                    {brand.name}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}

// Helper functions
function buildCategoryTree(categories: LeanCategory[]): CategoryNode[] {
    const map: Record<string, CategoryNode> = {};
    const roots: CategoryNode[] = [];
    categories.forEach(category => {
        map[category._id.toString()] = { ...category, children: [] };
    });
    categories.forEach(category => {
        if (category.parent) {
            const parentNode = map[category.parent.toString()];
            if (parentNode) {
                parentNode.children.push(map[category._id.toString()]);
            }
        } else {
            roots.push(map[category._id.toString()]);
        }
    });
    return roots;
} 