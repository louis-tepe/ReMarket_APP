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
import {
    FrontendCategory,
    CategoryDropdownLevel,
    ProductModelReMarketSelectItem,
    DisplayableProductModel,
    FormFieldDefinition,
    Specifications,
    IBrand
} from '@/app/(main)/account/sell/types';
import { NOT_LISTED_ID } from '@/app/(main)/account/sell/types';
import { Loader2, CheckCircle, ArrowRight, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ScrapeCandidate {
    title: string;
    url: string;
    similarity?: number;
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

export default function SellPage() {
    const [step, setStep] = useState(1);
    const { status: sessionStatus } = useSession();
    const router = useRouter();

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
        reset: resetForm,
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

    const resetSellProcess = useCallback(() => {
        setStep(1);
        setCategoryDropdowns([]);
        setFinalSelectedLeafCategory(null);
        setBrands([]);
        setSelectedBrandId(null);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModelReMarketId(null);
        setSelectedProductModel(null);
        setShowCreateByName(false);
        setNewProductModelName('');
        setOfferSpecificFieldValues({});
        setOfferSpecificFieldDefinitions([]);
        
        setJobId(null);
        setScrapeCandidates([]);
        setScrapeError(null);

        resetForm();
        if (allCategories.length > 0) {
            setCategoryDropdowns([
                {
                    level: 0,
                    parentId: null,
                    options: allCategories.filter(cat => cat.depth === 0),
                    selectedId: null,
                    placeholder: "Sélectionnez la catégorie principale"
                }
            ]);
        }
    }, [allCategories, resetForm]);

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
                    } else if (field.type === 'number') {
                        initialSpecificValues[field.name] = '';
                    } else if (field.type === 'boolean') {
                        initialSpecificValues[field.name] = false;
                    } else {
                        initialSpecificValues[field.name] = '';
                    }
                });
                setOfferSpecificFieldDefinitions(formFieldsData.formFields);
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
            setSelectedProductModel(null);
            setNewProductModelName('');
            setIsLoadingFullProduct(false);
            return;
        }
        setShowCreateByName(false);
        setIsLoadingFullProduct(true);
        try {
            const response = await fetch(`/api/product-models/${productModelId}`);
            const fullProductModelData = await response.json();
            if (!response.ok) throw new Error(fullProductModelData.message || "Erreur chargement détail produit.");
            
            const fullProductModel = fullProductModelData as DisplayableProductModel;
            
            setSelectedProductModel(fullProductModel);
            setStep(2);
            toast.success("Produit ReMarket sélectionné", { description: `Prêt à décrire: ${fullProductModel.title}` });
        } catch (error) {
            toast.error("Erreur Chargement Produit", { description: (error as Error).message });
            setSelectedProductModelReMarketId(null);
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

    const handleBackToBrandSelection = () => {
        setSelectedBrandId(null);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModelReMarketId(null);
        setShowCreateByName(false);
        setNewProductModelName('');
        setJobId(null);
        setScrapeCandidates([]);
        setScrapeError(null);
    };

    const onOfferSubmit = async (formData: TOfferFormSchema) => {
        if (!finalSelectedLeafCategory || !selectedProductModel) {
            toast.error("Erreur", { description: "Catégorie ou modèle de produit manquant." });
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

    const getDisplayString = (value: any): string => {
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
        if (offerSpecificFieldDefinitions.length === 0) return null;

        return (
            <div className="my-6 p-4 border rounded-md bg-muted/20">
                <h3 className="font-semibold text-lg mb-4">Détails spécifiques à la catégorie</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {offerSpecificFieldDefinitions.map(field => (
                        <div key={field.name} className="space-y-2">
                            <Label htmlFor={field.name}>
                                {field.label}
                                {field.required && <span className="text-destructive">*</span>}
                            </Label>
                            {field.type === 'boolean' ? (
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id={field.name}
                                        checked={offerSpecificFieldValues[field.name] as boolean}
                                        onCheckedChange={(value) => handleSpecificFieldChange(field.name, value)}
                                    />
                                    <Label htmlFor={field.name}>{field.description}</Label>
                                </div>
                            ) : field.type === 'select' ? (
                                <Select onValueChange={(value) => handleSpecificFieldChange(field.name, value)} value={offerSpecificFieldValues[field.name] as string}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={field.placeholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {field.options?.map(option => (
                                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id={field.name}
                                    type={field.type}
                                    value={offerSpecificFieldValues[field.name] as string | number}
                                    onChange={(e) => handleSpecificFieldChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
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
        <AlertDialog open={scrapeCandidates.length > 0} onOpenChange={() => {
            if (!isSelectingScrape) {
                setScrapeCandidates([]);
                setJobId(null);
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

    const renderStep2_ProductConfirmation = () => {
        if (!selectedProductModel) return <p>Chargement des détails du produit...</p>;

        const { displayAttributes, displayTitle, displayBrand, displayCategory, displayAsin, displayStandardDescription, displayImageUrls } = prepareDisplayData();

        return (
            <>
                <Card>
                    <CardHeader>
                        <CardTitle>Étape 2: Confirmez votre produit</CardTitle>
                        <CardDescription>
                            Vérifiez que les informations ci-dessous correspondent bien à votre article.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="md:w-1/3">
                                <Image
                                    src={displayImageUrls[0]}
                                    alt={`Image pour ${displayTitle}`}
                                    width={200}
                                    height={200}
                                    className="rounded-lg object-cover w-full"
                                />
                            </div>
                            <div className="md:w-2/3 space-y-3">
                                <h3 className="text-2xl font-bold">{displayTitle}</h3>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p><strong>Marque:</strong> {displayBrand}</p>
                                    <p><strong>Catégorie:</strong> {displayCategory}</p>
                                    {displayAsin && <p><strong>ASIN:</strong> {displayAsin}</p>}
                                </div>
                                <p className="text-sm">{displayStandardDescription || 'Aucune description disponible.'}</p>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t">
                            <h4 className="font-semibold mb-3">Spécifications</h4>
                            <ul className="space-y-1 text-sm list-disc list-inside">
                                {displayAttributes.map((attr, index) => <li key={`${attr.label}-${index}`}><strong>{attr.label}:</strong> {attr.value}</li>)}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
                <div className="mt-6 flex justify-between">
                    <Button variant="outline" onClick={handleBackToStep1}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Changer de produit
                    </Button>
                    <Button onClick={() => setStep(3)}>
                        Continuer <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </>
        )
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