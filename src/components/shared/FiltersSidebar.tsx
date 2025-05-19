'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ICategory } from '@/models/CategoryModel'; // Assurez-vous que le chemin est correct
import { IBrand } from '@/models/BrandModel'; // Assurez-vous que le chemin est correct
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
import { cn } from '@/lib/utils'; // Pour conditionnellement appliquer des classes Tailwind

interface CategoryNode extends ICategory {
    children: CategoryNode[];
    // ancestorIds?: string[]; // Pas directement utilisé dans cette version de renderCategory
}

interface FiltersSidebarProps {
    allCategories: ICategory[];
    allBrands: IBrand[];
    initialCategorySlug?: string;
    onFiltersChange: (filters: { categorySlug?: string; brandSlugs?: string[] }) => void;
    // Pour la navigation de page en page catégorie:
    basePath?: string; // ex: '/categories'
    currentCategoryAncestors?: string[]; // IDs des ancêtres de la catégorie sélectionnée
}

const BASE_CATEGORY_ITEM_PADDING_X = "px-2"; // Padding horizontal de base pour chaque item de catégorie
const INDENT_PER_DEPTH = 10; // Augmentation du padding-left (en px) par niveau de profondeur

export default function FiltersSidebar({
    allCategories,
    allBrands,
    initialCategorySlug,
    onFiltersChange,
    basePath = '/categories',
    currentCategoryAncestors = [],
}: FiltersSidebarProps) {
    const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | undefined>(initialCategorySlug);
    const [selectedBrandSlugs, setSelectedBrandSlugs] = useState<string[]>([]);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    // isSidebarVisible est géré par la page parente maintenant

    const categoriesTree = useMemo(() => {
        const map: Record<string, CategoryNode> = {};
        const roots: CategoryNode[] = [];
        allCategories.forEach(category => {
            map[category._id.toString()] = { ...category, children: [] };
        });
        allCategories.forEach(category => {
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
    }, [allCategories]);

    const getAncestorsOfNode = useCallback((nodeId: string, tree: CategoryNode[]): string[] => {
        const getPath = (nodes: CategoryNode[], id: string, currentPath: string[]): string[] | null => {
            for (const node of nodes) {
                if (node._id.toString() === id) return [...currentPath, node._id.toString()];
                const pathFromChild = getPath(node.children, id, [...currentPath, node._id.toString()]);
                if (pathFromChild) return pathFromChild;
            }
            return null;
        };
        const path = getPath(tree, nodeId, []);
        return path ? path.slice(0, -1) : []; // Exclure le nœud lui-même
    }, []);

    const findCategoryNodeInTree = useCallback((nodes: CategoryNode[], id: string): CategoryNode | null => {
        for (const node of nodes) {
            if (node._id.toString() === id) return node;
            const foundInChildren = findCategoryNodeInTree(node.children, id);
            if (foundInChildren) return foundInChildren;
        }
        return null;
    }, []);

    useEffect(() => {
        setSelectedCategorySlug(initialCategorySlug);
        const newExpandedState: Record<string, boolean> = {};
        currentCategoryAncestors.forEach(ancestorId => {
            newExpandedState[ancestorId] = true;
        });
        if (initialCategorySlug) {
            const currentCatData = allCategories.find(c => c.slug === initialCategorySlug);
            if (currentCatData) {
                const currentCatNode = findCategoryNodeInTree(categoriesTree, currentCatData._id.toString());
                if (currentCatNode && currentCatNode.children && currentCatNode.children.length > 0) {
                    newExpandedState[currentCatData._id.toString()] = true;
                }
            }
        }
        setExpandedCategories(newExpandedState);
    }, [initialCategorySlug, currentCategoryAncestors, allCategories, categoriesTree, findCategoryNodeInTree]);

    const handleCategoryClick = useCallback((category: CategoryNode) => {
        setSelectedCategorySlug(category.slug);
        const newExpandedState: Record<string, boolean> = {};
        const ancestors = getAncestorsOfNode(category._id.toString(), categoriesTree);
        ancestors.forEach(ancestorId => {
            newExpandedState[ancestorId] = true;
        });
        if (category.children && category.children.length > 0) {
            newExpandedState[category._id.toString()] = true;
        }
        setExpandedCategories(prev => ({ ...prev, ...newExpandedState }));
    }, [categoriesTree, getAncestorsOfNode]);

    useEffect(() => {
        onFiltersChange({
            categorySlug: selectedCategorySlug,
            brandSlugs: selectedBrandSlugs.length > 0 ? selectedBrandSlugs : undefined,
        });
    }, [selectedCategorySlug, selectedBrandSlugs, onFiltersChange]);

    const handleBrandChange = (brandSlug: string, checked: boolean | string) => {
        setSelectedBrandSlugs(prev =>
            checked ? [...prev, brandSlug] : prev.filter(slug => slug !== brandSlug)
        );
    };

    const toggleManualExpansion = (categoryId: string) => {
        setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const renderCategory = (category: CategoryNode, depth: number) => {
        const isSelected = selectedCategorySlug === category.slug;
        const isAncestor = currentCategoryAncestors.includes(category._id.toString()) ||
            (selectedCategorySlug && getAncestorsOfNode(allCategories.find(c => c.slug === selectedCategorySlug)?._id.toString() || ' ', categoriesTree).includes(category._id.toString()));

        const hasChildren = category.children && category.children.length > 0;
        const isExplicitlyExpanded = expandedCategories[category._id.toString()] === true;

        const indentStyle = { paddingLeft: `${depth * INDENT_PER_DEPTH}px` };

        return (
            <div key={category._id.toString()} className="mb-0.5">
                <div
                    style={indentStyle}
                    className={cn(
                        "rounded-md", // Appliquer le fond arrondi ici
                        (isSelected || isAncestor) && "bg-secondary/60"
                    )}
                >
                    <div className={cn(
                        "flex items-center justify-between group",
                        BASE_CATEGORY_ITEM_PADDING_X, // Padding horizontal de base pour l'item
                        "py-0.5" // Padding vertical
                    )}>
                        <Link
                            href={`${basePath}/${category.slug}`}
                            passHref
                            className="flex-grow min-w-0" // Important pour que truncate fonctionne
                            onClick={() => handleCategoryClick(category)}
                        >
                            <div // Div pour le nom, truncate s'appliquera à cet élément
                                className={cn(
                                    "justify-start text-left h-auto truncate", // py et px gérés par le parent ou ici si besoin spécifique
                                    "hover:text-primary", // Simple changement de couleur au survol
                                    isSelected && "font-semibold text-primary",
                                    isAncestor && !isSelected && "font-medium text-secondary-foreground/90"
                                    // Pas besoin de bg-accent ici car le parent gère le fond pour sélection/ancêtre
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
        setSelectedCategorySlug(undefined);
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
                            {selectedCategorySlug && (
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
                                            <div key={brand._id.toString()} className="flex items-center space-x-2 py-0.5 px-1 rounded-md hover:bg-accent">
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