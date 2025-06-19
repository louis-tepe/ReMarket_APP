'use client';

import React, { useState, FormEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TNewOfferSchema } from '@/lib/validators/offer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Loader2, CheckCircle, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormFieldDefinition } from '@/types/form.types';
import type {
  FrontendCategory,
  CategoryDropdownLevel,
  IBrand,
  ProductModelReMarketSelectItem,
  DisplayableProductModel,
  Specifications,
} from './types';
import { NOT_LISTED_ID } from './types';
import Link from 'next/link';
import { IShippingAddress } from '@/lib/mongodb/models/User';

interface ScrapeCandidate {
    title: string;
    url: string;
    similarity?: number;
    leDenicheurId: number;
}

const OfferFormSchema = z.object({
  price: z.string().nonempty("Le prix est requis."),
  condition: z.enum(['new', 'like-new', 'good', 'fair', 'poor']),
  description: z.string().optional(),
  stockQuantity: z.string().nonempty("La quantité est requise."),
  images: z
    .custom<FileList>()
    .refine((files) => files?.length > 0, 'Au moins une image est requise.')
    .refine((files) => files?.length <= 5, 'Maximum 5 images.'),
});

type TOfferFormSchema = z.infer<typeof OfferFormSchema>;

interface UserWithAddress {
    shippingAddresses?: IShippingAddress[];
}

export default function SellPage() {
    const [step, setStep] = useState(1);
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();
    
    const userWithAddress = session?.user as (UserWithAddress & { id: string }) | undefined;
    const hasShippingAddress = userWithAddress?.shippingAddresses && userWithAddress.shippingAddresses.length > 0;

    const [allCategories, setAllCategories] = useState<FrontendCategory[]>([]);
    const [categoryDropdowns, setCategoryDropdowns] = useState<CategoryDropdownLevel[]>([]);
    const [finalSelectedLeafCategory, setFinalSelectedLeafCategory] = useState<FrontendCategory | null>(null);

    const [brands, setBrands] = useState<IBrand[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [productModelsReMarketSelectItems, setProductModelsReMarketSelectItems] = useState<ProductModelReMarketSelectItem[]>([]);
    const [selectedProductModelReMarketId, setSelectedProductModelReMarketId] = useState<string | null>(null);

    const [showCreateByName, setShowCreateByName] = useState(false);
    const [newProductModelName, setNewProductModelName] = useState('');
    const [selectedProductModel, setSelectedProductModel] = useState<DisplayableProductModel | null>(null);
    const [offerSpecificFieldValues, setOfferSpecificFieldValues] = useState<Record<string, string | number | boolean>>({});
    const [offerSpecificFieldDefinitions, setOfferSpecificFieldDefinitions] = useState<FormFieldDefinition[]>([]);

    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isLoadingBrands, setIsLoadingBrands] = useState(false);
    const [isLoadingProductModels, setIsLoadingProductModels] = useState(false);
    const [isLoadingFullProduct, setIsLoadingFullProduct] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

    const [jobId, setJobId] = useState<string | null>(null);
    const [scrapeCandidates, setScrapeCandidates] = useState<ScrapeCandidate[]>([]);
    const [isInitiatingScrape, setIsInitiatingScrape] = useState(false);
    const [isSelectingScrape, setIsSelectingScrape] = useState(false);
    const [scrapeError, setScrapeError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        control,
        formState: { errors, isValid },
        watch,
    } = useForm<TOfferFormSchema>({
        resolver: zodResolver(OfferFormSchema),
        mode: 'onTouched',
        defaultValues: {
            price: '',
            condition: 'good',
            stockQuantity: '1',
            description: '',
        }
    });

    const watchedImages = watch("images");

    useEffect(() => {
        setIsLoadingCategories(true);
        fetch('/api/categories')
            .then(res => {
                if (!res.ok) throw new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
                return res.json();
            })
            .then(data => {
                if (data && data.success && Array.isArray(data.categories)) {
                    const typedCategories = data.categories as FrontendCategory[];
                    setAllCategories(typedCategories);
                    setCategoryDropdowns([
                        {
                            level: 0,
                            parentId: null,
                            options: typedCategories.filter((cat: FrontendCategory) => cat.depth === 0),
                            selectedId: null,
                            placeholder: "Sélectionnez la catégorie principale"
                        }
                    ]);
                } else {
                    setAllCategories([]);
                }
            })
            .catch(err => {
                console.error("Erreur chargement catégories:", err);
                toast.error("Erreur Catégories", { description: err instanceof Error ? err.message : "Impossible de charger les catégories." });
                setAllCategories([]);
            })
            .finally(() => setIsLoadingCategories(false));
    }, []);

    const handleCategoryLevelSelect = (level: number, categoryId: string) => {
        const selectedCategory = allCategories.find(cat => cat._id === categoryId);

        if (!selectedCategory) return;

        const updatedDropdowns = categoryDropdowns.slice(0, level + 1).map((dropdown, index) => {
            if (index === level) {
                return { ...dropdown, selectedId: categoryId };
            }
            return dropdown;
        });

        setFinalSelectedLeafCategory(null);
        setBrands([]);
        setSelectedBrandId(null);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModelReMarketId(null);
        setShowCreateByName(false);
        setOfferSpecificFieldValues({});
        setOfferSpecificFieldDefinitions([]);

        if (selectedCategory.isLeafNode) {
            setFinalSelectedLeafCategory(selectedCategory);
            setCategoryDropdowns(updatedDropdowns);
            toast.success(`Catégorie sélectionnée: ${selectedCategory.name}`);
            fetchCategorySpecificFormFields(selectedCategory.slug);
        } else {
            const children = allCategories.filter(cat => cat.parent?.toString() === categoryId);
            if (children.length > 0) {
                setCategoryDropdowns([
                    ...updatedDropdowns,
                    {
                        level: level + 1,
                        parentId: categoryId,
                        options: children,
                        selectedId: null,
                        placeholder: `Sélectionnez une sous-catégorie de ${selectedCategory.name}`
                    }
                ]);
            } else {
                setCategoryDropdowns(updatedDropdowns);
                toast.info("Info", { description: "Cette catégorie est considérée comme finale." });
                fetchCategorySpecificFormFields(selectedCategory.slug);
            }
        }
    };

    const fetchCategorySpecificFormFields = async (categorySlug: string) => {
        if (!categorySlug) return;
        try {
            const response = await fetch(`/api/categories/${categorySlug}/attributes`);
        if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erreur ${response.status} lors du chargement du formulaire.`);
            }
            const formFieldsData = await response.json();
            if (formFieldsData && formFieldsData.success && Array.isArray(formFieldsData.formFields)) {
                const initialSpecificValues: Record<string, string | number | boolean> = {};
                (formFieldsData.formFields as FormFieldDefinition[]).forEach((field: FormFieldDefinition) => {
                    if (field.defaultValue !== undefined) {
                        initialSpecificValues[field.name] = field.defaultValue;
                    }
                });
                setOfferSpecificFieldDefinitions(formFieldsData.formFields as FormFieldDefinition[]);
                setOfferSpecificFieldValues(initialSpecificValues);
            } else {
                setOfferSpecificFieldDefinitions([]);
                setOfferSpecificFieldValues({});
                toast.error("Formulaire Dynamique", { description: formFieldsData.message || "Format de données de formulaire incorrect." });
            }
        } catch (error) {
            setOfferSpecificFieldDefinitions([]);
            setOfferSpecificFieldValues({});
            const typedError = error as Error;
            toast.error("Erreur Formulaire", { description: typedError.message || "Impossible de charger les champs du formulaire pour cette catégorie." });
        }
    };

    const handleSpecificFieldChange = (name: string, value: string | number | boolean) => {
        setOfferSpecificFieldValues(prev => ({ ...prev, [name]: value }));
    };

    const handleInitiateScrape = async (e: FormEvent) => {
        e.preventDefault();
        const trimmedNewProductModelName = newProductModelName.trim();
        if (!trimmedNewProductModelName) {
            toast.error("Le nom du produit ne peut pas être vide.");
            return;
        }

        const currentBrand = brands.find(b => b._id === selectedBrandId);
        if (!currentBrand) {
            toast.error("Aucune marque sélectionnée.");
            return;
        }

        const nameForScraping = `${currentBrand.name} ${trimmedNewProductModelName}`;

        setIsInitiatingScrape(true);
        setScrapeError(null);
        setScrapeCandidates([]);
        toast.info("Recherche en cours...", { description: `Recherche de candidats pour "${nameForScraping}".` });

        try {
            const response = await fetch('/api/scrape/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productName: nameForScraping }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur lors de l'initiation du scraping.");
            }
            
            setJobId(data.job_id);
            setScrapeCandidates(data.candidates);

        } catch (error) {
            const typedError = error as Error;
            console.error("Erreur initiate scrape:", typedError);
            setScrapeError(typedError.message);
            toast.error("Erreur de recherche", { description: typedError.message });
        } finally {
            setIsInitiatingScrape(false);
        }
    };

    const handleSelectAndScrape = async (candidateUrl: string | null) => {
        if (!candidateUrl) {
            setScrapeCandidates([]);
            setJobId(null);
            setScrapeError(null);
            toast.info("Recherche annulée", { description: "Vous pouvez affiner votre recherche." });
            return;
        }

        if (!jobId || !finalSelectedLeafCategory || !selectedBrandId) {
            toast.error("Erreur interne", { description: "Des informations de session sont manquantes (jobId, catégorie, marque)." });
            return;
        }

        setIsSelectingScrape(true);
        setScrapeError(null);
        toast.info("Standardisation en cours...", { description: "Récupération des détails du produit sélectionné." });

        try {
            const response = await fetch('/api/scrape/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobId: jobId,
                    selectedUrl: candidateUrl,
                    productNameToScrape: `${brands.find(b => b._id === selectedBrandId)?.name} ${newProductModelName.trim()}`,
                    categorySlug: finalSelectedLeafCategory.slug,
                    brandId: selectedBrandId,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Erreur lors de la finalisation du scraping.");
            }
            
            const newProductModel = data.productModel as DisplayableProductModel;

            toast.success("Produit standardisé avec succès !", {
                description: newProductModel.title,
            });

            setSelectedProductModel(newProductModel);
            setStep(2);
            setScrapeCandidates([]);
            setJobId(null);

        } catch (error) {
            const typedError = error as Error;
            console.error("Erreur select and scrape:", typedError);
            setScrapeError(typedError.message);
            toast.error("Erreur de standardisation", { description: typedError.message });
        } finally {
            setIsSelectingScrape(false);
        }
    };

    const handleSelectProductModel = async (productModelId: string) => {
        if (productModelId === NOT_LISTED_ID) {
            setShowCreateByName(true);
            return;
        }

        setIsLoadingFullProduct(true);
        try {
            const response = await fetch(`/api/product-models/${productModelId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erreur lors du chargement du produit.`);
            }
            const productData: DisplayableProductModel = await response.json();
            setSelectedProductModel(productData);
            setStep(2);

            // Automatically trigger price update in the background
            handleUpdatePrice(productData.leDenicheurId);

        } catch (error) {
            console.error(error);
            toast.error("Erreur", { description: error instanceof Error ? error.message : "Impossible de charger le produit." });
        } finally {
            setIsLoadingFullProduct(false);
        }
    };

    const handleBackToStep1 = () => {
        setSelectedProductModel(null);
        setSelectedProductModelReMarketId(null);
        setShowCreateByName(false);
        setNewProductModelName('');
        setJobId(null);
        setScrapeCandidates([]);
        setScrapeError(null);
        setStep(1);
    };

    const onOfferSubmit = async (formData: TOfferFormSchema) => {
        if (!finalSelectedLeafCategory || !selectedProductModel) {
            toast.error("Erreur", { description: "Catégorie ou modèle de produit manquant." });
            return;
        }

        const userId = (session?.user as { id?: string })?.id;
        if (!userId) {
            toast.error("Erreur", { description: "Identifiant de session manquant." });
            return;
        }

        setIsSubmitting(true);
        
        try {
            const uploadedImageUrls: string[] = [];
            if (formData.images) {
                for (const imageFile of Array.from(formData.images)) {
                    const formImageData = new FormData();
                    formImageData.append('file', imageFile);
                    const res = await fetch('/api/services/media/upload/images', { method: 'POST', body: formImageData });
                    const result = await res.json();
                    if (!res.ok || !result.success) throw new Error(result.message || "Échec de l'upload d'image.");
                    uploadedImageUrls.push(result.url);
                }
            }

            const specificFieldsPayload: Record<string, unknown> = {};
            Object.entries(offerSpecificFieldValues).forEach(([key, value]) => {
                if (value !== '') {
                    specificFieldsPayload[key] = value;
                }
            });

            const payload: Omit<TNewOfferSchema, 'productModelId'> & { productModelId: string } & Record<string, unknown> = {
                price: parseFloat(formData.price),
                stockQuantity: parseInt(formData.stockQuantity, 10),
                condition: formData.condition,
                images: uploadedImageUrls,
                productModelId: selectedProductModel._id,
                kind: finalSelectedLeafCategory.slug,
                currency: 'EUR',
                ...specificFieldsPayload,
            };

            if (formData.description && formData.description.trim().length > 0) {
                payload.description = formData.description;
            }

            const response = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const creationResult = await response.json();
            if (!response.ok) throw new Error(creationResult.message || "La création de l'offre a échoué.");

            toast.success("Offre publiée !");
            router.push(`/account/sales`);

        } catch (error) {
            toast.error("Erreur", { description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };

    type DisplayableValue = string | number | boolean | null | undefined | { name?: string; title?: string };
    const getDisplayString = (value: DisplayableValue): string => {
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'string') return value;
        if (typeof value === 'number') return String(value);
        if (typeof value === 'object') {
            if (value.name && typeof value.name === 'string') return value.name;
            if (value.title && typeof value.title === 'string') return value.title;
        }
        if (typeof value.toString === 'function') {
            const strValue = value.toString();
            if (strValue !== '[object Object]') return strValue;
        }
        return 'N/A';
    };

    const prepareDisplayData = () => {
        let displayAttributes: Specifications[] = [];
        let displayTitle = 'N/A';
        let displayBrand = 'N/A';
        let displayCategory = 'N/A';
        let displayAsin: string | undefined = undefined;
        let displayStandardDescription: string | undefined = 'N/A';
        let displayImageUrls: string[] = ['/images/placeholder-product.webp'];

        if (selectedProductModel) {
            displayTitle = selectedProductModel.title || 'N/A';
            displayBrand = getDisplayString(selectedProductModel.brand);
            displayCategory = getDisplayString(selectedProductModel.category);
            displayAsin = selectedProductModel.rawAsin;
            displayStandardDescription = selectedProductModel.standardDescription;
            
            const urls = selectedProductModel.standardImageUrls;
            if (urls && urls.length > 0) {
                displayImageUrls = urls;
            }

            if (selectedProductModel.specifications && selectedProductModel.specifications.length > 0) {
                displayAttributes = selectedProductModel.specifications;
            } else if (selectedProductModel.rawAttributes && selectedProductModel.rawAttributes.length > 0) {
                displayAttributes = selectedProductModel.rawAttributes;
            }
        }
        return { displayAttributes, displayTitle, displayBrand, displayCategory, displayAsin, displayStandardDescription, displayImageUrls };
    };

    const fetchBrandsAndProductModels = useCallback(async (categorySlug: string) => {
        setIsLoadingBrands(true);
        setIsLoadingProductModels(true);
        try {
            const brandsRes = await fetch(`/api/brands?categorySlug=${categorySlug}`);
            if (!brandsRes.ok) throw new Error('Erreur chargement marques.');
            const brandsData = await brandsRes.json();
            setBrands(brandsData.brands);
        } catch (error) {
            toast.error("Erreur Marques", { description: (error as Error).message });
            setBrands([]);
        } finally {
            setIsLoadingBrands(false);
        }
        setIsLoadingProductModels(false);
    }, []);

    useEffect(() => {
        if (finalSelectedLeafCategory) {
            fetchBrandsAndProductModels(finalSelectedLeafCategory.slug);
        }
    }, [finalSelectedLeafCategory, fetchBrandsAndProductModels]);

    const handleSelectBrand = (brandId: string) => {
        setSelectedBrandId(brandId);
        setSelectedProductModelReMarketId(null);
        setShowCreateByName(false);
        if (!finalSelectedLeafCategory) return;
        setIsLoadingProductModels(true);
        fetch(`/api/product-models/search?categorySlug=${finalSelectedLeafCategory.slug}&brandId=${brandId}`)
            .then(res => res.json())
            .then(data => {
                if(data.success) {
                    setProductModelsReMarketSelectItems(data.productModels);
                }
            })
            .catch(err => console.error(err))
            .finally(() => setIsLoadingProductModels(false));
    };

    const renderDynamicFields = () => {
        if (!selectedProductModel) return null;

        return offerSpecificFieldDefinitions.map((field) => {
            const label = <Label htmlFor={field.name}>{field.label}</Label>;
            const description = field.description ? <p className="text-sm text-muted-foreground">{field.description}</p> : null;

            if (field.type === 'switch') {
                return (
                    <div key={field.name} className="flex items-center space-x-2">
                        <Switch
                            id={field.name}
                            checked={offerSpecificFieldValues[field.name] as boolean}
                            onCheckedChange={(checked) => handleSpecificFieldChange(field.name, checked)}
                        />
                        {label}
                        {description}
                    </div>
                );
            }

            if (field.type === 'select') {
                return (
                    <div key={field.name} className="space-y-2">
                        {label}
                        <Select
                            name={field.name}
                            value={offerSpecificFieldValues[field.name] as string}
                            onValueChange={(value) => handleSpecificFieldChange(field.name, value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {field.options?.map(option => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {description}
                    </div>
                );
            }
            
            const commonInputProps = {
                name: field.name,
                value: offerSpecificFieldValues[field.name] as string | number | undefined,
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                    handleSpecificFieldChange(field.name, e.target.value),
            };

            return (
                <div key={field.name} className="space-y-2">
                    {label}
                    <Input {...commonInputProps} placeholder={field.placeholder} />
                    {description}
                </div>
            );
        });
    };

    const renderCategoryDropdowns = () => {
        return categoryDropdowns.map((dropdown, index) => (
            <div key={`cat-level-${index}`} className="mb-4">
                <Label htmlFor={`category-level-${index}`}>{dropdown.level === 0 ? "1. Catégorie" : `Sous-catégorie`}</Label>
                <Select
                    value={dropdown.selectedId || ''}
                    onValueChange={(value) => handleCategoryLevelSelect(dropdown.level, value)}
                    disabled={isLoadingCategories || (index > 0 && !categoryDropdowns[index - 1]?.selectedId) || isInitiatingScrape || isSelectingScrape}
                >
                    <SelectTrigger id={`category-level-${index}`} className="bg-input">
                        <SelectValue placeholder={isLoadingCategories && index === 0 ? "Chargement..." : dropdown.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {dropdown.options.length > 0 ? (
                            dropdown.options.map((cat: FrontendCategory) => (
                                <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-options" disabled>Aucune sous-catégorie</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
        ));
    };

    const renderCandidatesModal = () => (
        <AlertDialog open={scrapeCandidates.length > 0} onOpenChange={(open) => {
            if (!open && !isSelectingScrape) {
                setScrapeCandidates([]);
                setJobId(null);
                setScrapeError(null);
            }
        }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirmez-vous le produit ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Nous avons trouvé plusieurs correspondances. Veuillez sélectionner le produit exact que vous souhaitez vendre.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
                    {scrapeCandidates.map((candidate, index) => (
                        <Button
                            key={index}
                            variant="outline"
                            className="w-full justify-start text-left h-auto py-2"
                            onClick={() => handleSelectAndScrape(candidate.url)}
                            disabled={isSelectingScrape}
                        >
                            {candidate.title}
                        </Button>
                    ))}
                    <Button
                        variant="destructive"
                        className="w-full justify-start mt-4"
                        onClick={() => handleSelectAndScrape(null)}
                        disabled={isSelectingScrape}
                    >
                        Aucun de ces produits ne correspond
                    </Button>
                </div>
                 {isSelectingScrape && (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span className="text-muted-foreground">Standardisation en cours...</span>
                    </div>
                )}
                {scrapeError && (
                    <div className="flex items-center p-4 mt-2 text-destructive bg-destructive/10 rounded-md">
                        <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                        <span className="text-sm">{scrapeError}</span>
                    </div>
                )}
            </AlertDialogContent>
        </AlertDialog>
    );

    const renderStep1_Selection = () => (
        <Card>
            <CardHeader>
                <CardTitle>Étape 1: Quel produit vendez-vous ?</CardTitle>
                <CardDescription>
                    Commencez par sélectionner une catégorie pour trouver votre produit.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {renderCategoryDropdowns()}

                {finalSelectedLeafCategory && (
                    <div className="mt-6 pt-6 border-t">
                        <Label>2. Marque</Label>
                        <Select onValueChange={handleSelectBrand} value={selectedBrandId || ''} disabled={isLoadingBrands}>
                            <SelectTrigger><SelectValue placeholder={isLoadingBrands ? "Chargement..." : "Sélectionnez une marque"} /></SelectTrigger>
                            <SelectContent>
                                {brands.map(brand => <SelectItem key={brand._id} value={brand._id}>{brand.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {selectedBrandId && (
                    <div className="mt-6 pt-6 border-t">
                        <Label>3. Modèle du produit</Label>
                        {isLoadingProductModels ? <Loader2 className="animate-spin mt-2" /> : (
                            <>
                                <Select onValueChange={handleSelectProductModel} value={selectedProductModelReMarketId || ''}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionnez un modèle existant" /></SelectTrigger>
                                    <SelectContent>
                                        {productModelsReMarketSelectItems.map((pm, index) => <SelectItem key={`${pm.id}-${index}`} value={pm.id}>{pm.name}</SelectItem>)}
                                        <SelectItem value={NOT_LISTED_ID}>Produit non listé / Créer</SelectItem>
                                    </SelectContent>
                                </Select>

                                {showCreateByName && (
                                    <form onSubmit={handleInitiateScrape} className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
                                        <p className="text-sm font-medium">Rechercher pour créer un nouveau modèle de produit</p>
                                        <div className="relative">
                                            <Input
                                                type="search"
                                                placeholder="Ex: iPhone 13 Pro 256Go"
                                                value={newProductModelName}
                                                onChange={(e) => setNewProductModelName(e.target.value)}
                                                className="pr-20"
                                                disabled={isInitiatingScrape}
                                            />
                                            <Button 
                                                type="submit" 
                                                className="absolute top-0 right-0 rounded-l-none" 
                                                disabled={!newProductModelName.trim() || isInitiatingScrape}
                                            >
                                                {isInitiatingScrape ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechercher'}
                                            </Button>
                                        </div>
                                        {scrapeError && <p className="text-sm text-destructive mt-2">{scrapeError}</p>}
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const handleUpdatePrice = async (productId: number) => {
        if (!productId) {
            toast.error("Aucun ID de produit disponible pour la mise à jour.");
            return;
        }
        setIsUpdatingPrice(true);
        try {
            const response = await fetch('/api/update-product-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Échec de la mise à jour des prix.');
            }
            
            setSelectedProductModel(prevModel => {
                if (!prevModel) return null;
                
                const updatedProductData = result.product;

                return {
                    ...prevModel,
                    options: updatedProductData.options,
                    price_analysis: updatedProductData.price_analysis,
                };
            });

            toast.success('Les prix ont été mis à jour avec succès !');

        } catch (error) {
            console.error('Erreur lors de la mise à jour du prix :', error);
            const message = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.';
            toast.error('Échec de la mise à jour des prix', { description: message });
        } finally {
            setIsUpdatingPrice(false);
        }
    };

    const renderStep2_ProductConfirmation = () => {
        if (isLoadingFullProduct) {
            return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin mr-2" /> Chargement des détails du produit...</div>;
        }

        if (!selectedProductModel) {
            return (
                <div className="text-center p-8">
                    <p>Aucun produit sélectionné.</p>
                    <Button onClick={handleBackToStep1} variant="outline" className="mt-4">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la sélection
                    </Button>
                </div>
            );
        }

        const displayData = prepareDisplayData();

        return (
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{selectedProductModel.title}</CardTitle>
                            <CardDescription>Confirmez les informations du produit avant de continuer.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        {displayData.displayImageUrls.length > 0 && (
                            <Image
                                src={displayData.displayImageUrls[0]}
                                alt={`Image pour ${selectedProductModel.title}`}
                                width={200}
                                height={200}
                                className="rounded-lg object-cover w-full"
                            />
                        )}
                    </div>
                    <div className="space-y-4">
                        <Tabs defaultValue="specifications">
                            <TabsList>
                                <TabsTrigger value="specifications">Spécifications</TabsTrigger>
                                <TabsTrigger value="price-info">Infos Prix</TabsTrigger>
                            </TabsList>
                            <TabsContent value="specifications">
                                <h4 className="font-semibold text-lg mb-2">Spécifications</h4>
                                <ul className="list-disc pl-5 space-y-1 text-sm">
                                    {displayData.displayAttributes.map((attr, index) => (
                                        <li key={`${attr.label}-${index}`}>
                                            <span className="font-semibold">{attr.label}:</span> {attr.value}
                                        </li>
                                    ))}
                                </ul>
                            </TabsContent>
                            <TabsContent value="price-info">
                                <div className="mt-4">
                                    <h4 className="font-semibold text-lg mb-2 flex items-center">
                                        Analyse de Prix
                                        {isUpdatingPrice && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                    </h4>
                                    {selectedProductModel.price_analysis ? (
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                            {Object.entries(selectedProductModel.price_analysis).map(([period, data]) => (
                                                data && data.average_price && <li key={period}>
                                                    <span className="font-semibold">{period.replace('_', ' ')}:</span> {data.average_price?.toFixed(2)}€ ({data.data_points} points de données)
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-gray-500">Aucune analyse de prix disponible.</p>
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleBackToStep1}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                    </Button>
                    <Button onClick={() => setStep(3)}>
                        Continuer <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    const renderOfferForm = () => (
        <Card>
            <CardHeader>
                <CardTitle>Étape 3: Décrivez votre offre</CardTitle>
                <CardDescription>Détails de l'article : {selectedProductModel?.title || 'Produit'}</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onOfferSubmit)} noValidate>
                <CardContent className="space-y-6">
                    {renderDynamicFields()}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="price">Prix (€)</Label>
                            <Input id="price" type="number" step="0.01" {...register('price')} placeholder="150" />
                            {errors.price && <p className="text-sm text-destructive mt-2">{errors.price.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>État</Label>
                            <Controller name="condition" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new">Neuf</SelectItem>
                                        <SelectItem value="like-new">Comme neuf</SelectItem>
                                        <SelectItem value="good">Bon état</SelectItem>
                                        <SelectItem value="fair">État correct</SelectItem>
                                        <SelectItem value="poor">Abîmé</SelectItem>
                                    </SelectContent>
                                </Select>
                            )} />
                            {errors.condition && <p className="text-sm text-destructive mt-2">{errors.condition.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="stockQuantity">Quantité</Label>
                            <Input id="stockQuantity" type="number" step="1" {...register('stockQuantity')} placeholder="1" />
                            {errors.stockQuantity && <p className="text-sm text-destructive mt-2">{errors.stockQuantity.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea id="description" {...register('description')} placeholder="Ex: Vendu avec boîte d'origine..." />
                        {errors.description && <p className="text-sm text-destructive mt-2">{errors.description.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="photos">Photos (jusqu&apos;à 5)</Label>
                        <Input id="photos" type="file" multiple accept="image/*" {...register('images')} />
                        {errors.images && <p className="text-sm text-destructive mt-2">{errors.images.message}</p>}
                        {watchedImages?.length > 0 && (
                            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {Array.from(watchedImages).map((file, index) => (
                                    <div key={index} className="relative w-24 h-24">
                                        <Image src={URL.createObjectURL(file)} alt={`preview ${index}`} fill className="rounded-md object-cover" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setStep(2)}><ArrowLeft className="mr-2 h-4 w-4" /> Retour</Button>
                    <Button type="submit" disabled={isSubmitting || !isValid || sessionStatus !== 'authenticated'}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Publier l&apos;offre
                        </Button>
                    </CardFooter>
            </form>
                </Card>
    );

    const renderCurrentStep = () => {
        switch (step) {
            case 1:
                return renderStep1_Selection();
            case 2:
                return renderStep2_ProductConfirmation();
            case 3:
                return renderOfferForm();
            default:
                return <p>Étape invalide</p>;
        }
    };

    if (sessionStatus === 'loading') {
        return <div className='container mx-auto p-4'><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (sessionStatus === 'unauthenticated') {
        router.push('/signin');
        return null;
    }

    if (!hasShippingAddress) {
        return (
            <div className="container mx-auto p-4">
                <Card className="text-center">
                    <CardHeader>
                        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                        <CardTitle className="mt-4">Adresse d'expédition manquante</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>
                            Vous devez ajouter une adresse d'expédition à votre profil avant de pouvoir mettre en vente un article.
                        </CardDescription>
                    </CardContent>
                    <CardFooter className="flex-col gap-4">
                        <Button asChild>
                            <Link href="/account/settings">Ajouter une adresse</Link>
                        </Button>
                        <Button variant="ghost" onClick={() => router.back()}>
                            Retour
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">Vendre un article</h1>
            <p className="text-muted-foreground mb-8">
                Suivez les étapes pour mettre en vente votre produit rapidement et au meilleur prix.
            </p>
            {renderCurrentStep()}
            {renderCandidatesModal()}
        </div>
    );
} 