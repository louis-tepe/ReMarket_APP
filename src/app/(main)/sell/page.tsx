'use client';

import React from 'react';
import { useState, ChangeEvent, FormEvent, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import type { IScrapedProduct } from '@/models/ScrapedProduct';
import type { IProductModel as IProductModelReMarketType } from '@/models/ProductModel';
import { useSession } from "next-auth/react";
import type {
    Brand,
    ProductModelReMarketSelectItem,
    OfferDetails,
    DisplayableProductModel,
    AttributeItem,
    Specifications
} from './types';
import { ICategory } from '@/models/CategoryModel';
import { IBrand } from '@/models/BrandModel';
import { Loader2, CheckCircle, ArrowRight, RefreshCcw, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const NOT_LISTED_ID = "---PRODUCT_NOT_LISTED---";

interface CategoryDropdownLevel {
    level: number;
    parentId: string | null;
    options: ICategory[];
    selectedId: string | null;
    placeholder: string;
}

export default function SellPage() {
    const [step, setStep] = useState(1);
    const { data: session, status: sessionStatus } = useSession();
    const router = useRouter();

    const [allCategories, setAllCategories] = useState<ICategory[]>([]);
    const [categoryDropdowns, setCategoryDropdowns] = useState<CategoryDropdownLevel[]>([]);
    const [finalSelectedLeafCategory, setFinalSelectedLeafCategory] = useState<ICategory | null>(null);

    const [brands, setBrands] = useState<IBrand[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [productModelsReMarketSelectItems, setProductModelsReMarketSelectItems] = useState<ProductModelReMarketSelectItem[]>([]);
    const [selectedProductModelReMarketId, setSelectedProductModelReMarketId] = useState<string | null>(null);

    const [showCreateByName, setShowCreateByName] = useState(false);
    const [newProductModelName, setNewProductModelName] = useState('');
    const [selectedProductModel, setSelectedProductModel] = useState<DisplayableProductModel | null>(null);
    const initialOfferDetails: OfferDetails = {
        price: '',
        currency: 'EUR',
        condition: 'used_good',
        sellerDescription: '',
        photos: [],
        dynamicFields: {},
    };
    const [offerDetails, setOfferDetails] = useState<OfferDetails>(initialOfferDetails);

    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isLoadingBrands, setIsLoadingBrands] = useState(false);
    const [isLoadingProductModels, setIsLoadingProductModels] = useState(false);
    const [isLoadingCreate, setIsLoadingCreate] = useState(false);
    const [isLoadingFullProduct, setIsLoadingFullProduct] = useState(false);
    const [isLoadingSubmitOffer, setIsLoadingSubmitOffer] = useState(false);

    const resetSellProcess = () => {
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
        setOfferDetails(initialOfferDetails);
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
    };

    useEffect(() => {
        setIsLoadingCategories(true);
        fetch('/api/categories')
            .then(res => {
                if (!res.ok) throw new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
                return res.json();
            })
            .then(data => {
                if (data && data.success && Array.isArray(data.categories)) {
                    setAllCategories(data.categories);
                    setCategoryDropdowns([
                        {
                            level: 0,
                            parentId: null,
                            options: data.categories.filter((cat: ICategory) => cat.depth === 0),
                            selectedId: null,
                            placeholder: "Sélectionnez la catégorie principale"
                        }
                    ]);
                } else {
                    setAllCategories([]);
                    console.warn("Structure de données des catégories inattendue reçue:", data);
                    toast.error("Erreur Catégories", { description: data.message || "Format de données incorrect." });
                }
            })
            .catch(err => {
                console.error("Erreur chargement catégories:", err);
                toast.error("Erreur Catégories", { description: err.message || "Impossible de charger les catégories." });
                setAllCategories([]);
            })
            .finally(() => setIsLoadingCategories(false));
    }, []);

    const handleCategoryLevelSelect = (level: number, categoryId: string) => {
        const selectedCategory = allCategories.find(cat => cat._id.toString() === categoryId);

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

        if (selectedCategory.isLeafNode) {
            setFinalSelectedLeafCategory(selectedCategory);
            setCategoryDropdowns(updatedDropdowns);
            toast.success(`Catégorie sélectionnée: ${selectedCategory.name}`);
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
                toast.info("Info", { description: "Cette catégorie n'a pas de sous-catégories, mais n'est pas marquée comme feuille." })
            }
        }
    };

    useEffect(() => {
        if (finalSelectedLeafCategory) {
            setIsLoadingBrands(true);
            setBrands([]);
            setSelectedBrandId(null);
            fetch(`/api/brands?categorySlug=${finalSelectedLeafCategory.slug}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
                    return res.json();
                })
                .then(data => {
                    if (data && data.success && Array.isArray(data.brands)) {
                        setBrands(data.brands);
                        if (data.brands.length === 0) {
                            toast.info("Aucune Marque", { description: "Aucune marque trouvée pour cette catégorie. Vous pourrez en créer une si besoin." });
                        }
                    } else {
                        setBrands([]);
                        toast.error("Erreur Marques", { description: data.message || "Format de données incorrect pour les marques." });
                    }
                })
                .catch(err => {
                    console.error("Erreur chargement marques:", err);
                    toast.error("Erreur Marques", { description: err.message || "Impossible de charger les marques." });
                    setBrands([]);
                })
                .finally(() => setIsLoadingBrands(false));
        } else {
            setBrands([]);
            setSelectedBrandId(null);
        }
    }, [finalSelectedLeafCategory]);

    useEffect(() => {
        if (finalSelectedLeafCategory && selectedBrandId) {
            setIsLoadingProductModels(true);
            setProductModelsReMarketSelectItems([]);
            setSelectedProductModelReMarketId(null);
            setShowCreateByName(false);
            fetch(`/api/product-models?categorySlug=${finalSelectedLeafCategory.slug}&brandSlug=${selectedBrandId}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status} - ${res.statusText}`);
                    return res.json();
                })
                .then((data: any[] | { success: boolean; productModels?: any[]; message?: string }) => {
                    let items: ProductModelReMarketSelectItem[] = [];
                    if (Array.isArray(data)) {
                        items = data.map(pm => ({
                            id: pm._id ? pm._id.toString() : (pm.id ? pm.id.toString() : ''),
                            name: pm.title || pm.name || 'Produit sans nom'
                        })).filter(pm => pm.id);
                    } else if (data && data.success && Array.isArray(data.productModels)) {
                        items = data.productModels.map(pm => ({
                            id: pm._id ? pm._id.toString() : (pm.id ? pm.id.toString() : ''),
                            name: pm.title || pm.name || 'Produit sans nom'
                        })).filter(pm => pm.id);
                    } else if (data && data.message) {
                        console.info("Message de l'API ProductModels:", data.message);
                    }
                    const notListedOption: ProductModelReMarketSelectItem = {
                        id: NOT_LISTED_ID,
                        name: "Mon produit n'est pas dans cette liste (créer)",
                    };
                    setProductModelsReMarketSelectItems([...items, notListedOption]);
                    if (items.length === 0) {
                        toast.info("Info Produits", { description: "Aucun produit ReMarket existant. Sélectionnez l'option pour en créer un." });
                    }
                })
                .catch(err => {
                    console.error("Erreur chargement ProductModels:", err);
                    toast.error("Erreur Produits", { description: err.message || "Impossible de charger les produits." });
                    setProductModelsReMarketSelectItems([{ id: NOT_LISTED_ID, name: "Mon produit n'est pas dans cette liste (créer)" }]);
                })
                .finally(() => setIsLoadingProductModels(false));
        } else {
            setProductModelsReMarketSelectItems([]);
            setSelectedProductModelReMarketId(null);
        }
    }, [finalSelectedLeafCategory, selectedBrandId]);

    const handleSelectBrand = (brandSlug: string) => {
        setSelectedBrandId(brandSlug);
        setSelectedProductModelReMarketId(null);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModel(null);
        setShowCreateByName(false);
    };

    const handleSelectProductModelReMarket = async (productModelId: string) => {
        setSelectedProductModelReMarketId(productModelId);
        if (productModelId === NOT_LISTED_ID) {
            setShowCreateByName(true);
            setSelectedProductModel(null);
            const currentBrand = brands.find(b => b.slug === selectedBrandId);
            setNewProductModelName(currentBrand ? `${currentBrand.name} ` : '');
            setIsLoadingFullProduct(false);
            return;
        }
        setShowCreateByName(false);
        setIsLoadingFullProduct(true);
        try {
            const response = await fetch(`/api/product-models/${productModelId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Erreur HTTP: ${response.status} - ${response.statusText}` }));
                throw new Error(errorData.message);
            }
            const fullProductModel = (await response.json()) as IProductModelReMarketType & { _id: string };
            setSelectedProductModel(fullProductModel);
            setStep(2);
            toast.success("Produit ReMarket sélectionné", { description: `Prêt à décrire votre offre pour : ${fullProductModel.title}` });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Impossible de charger les détails du produit.";
            toast.error("Erreur Chargement Produit", { description: errorMessage });
            setSelectedProductModelReMarketId(null);
        }
        setIsLoadingFullProduct(false);
    };

    const handleScrapeNewProductModel = async (e: FormEvent) => {
        e.preventDefault();
        const trimmedNewProductModelName = newProductModelName.trim();
        if (!trimmedNewProductModelName) {
            toast.error("Nom du produit manquant", { description: "Veuillez entrer un nom précis pour le produit à rechercher." });
            return;
        }
        const currentBrand = brands.find(b => b.slug === selectedBrandId);
        if (!finalSelectedLeafCategory || !selectedBrandId || !currentBrand) {
            toast.error("Sélection Marque/Catégorie Feuille Manquante", { description: "Veuillez sélectionner une catégorie feuille et une marque valides." });
            return;
        }
        setIsLoadingCreate(true);
        setSelectedProductModel(null);
        let nameForScraping = trimmedNewProductModelName;
        if (!trimmedNewProductModelName.toLowerCase().startsWith(currentBrand.name.toLowerCase())) {
            nameForScraping = `${currentBrand.name} ${trimmedNewProductModelName}`;
        }
        toast.info("Recherche en cours...", { description: `Recherche d'informations pour "${nameForScraping}".` });

        try {
            const response = await fetch('/api/product-models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameForScraping,
                    categoryId: finalSelectedLeafCategory.slug,
                    brandId: selectedBrandId
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `Erreur ${response.status} lors de la création/scraping du produit.`);
            }

            if (data.productModel) {
                setIsLoadingFullProduct(true);
                const pmResponse = await fetch(`/api/product-models/${data.productModel._id}`);
                if (!pmResponse.ok) {
                    const errorData = await pmResponse.json().catch(() => ({ message: "Erreur interne en rechargeant le produit standardisé." }));
                    throw new Error(errorData.message);
                }
                const fullProductModelForDisplay = await pmResponse.json() as IProductModelReMarketType & { _id: string };
                setSelectedProductModel(fullProductModelForDisplay);
                setStep(2);
                toast.success("Produit Prêt !", { description: `Les informations pour "${fullProductModelForDisplay.title}" sont prêtes pour votre offre.` });
            } else if (data.scrapedProduct) {
                toast.warning("Produit Scrapé, Standardisation Partielle", {
                    description: `Nous avons trouvé "${data.scrapedProduct.title}", mais la standardisation ReMarket nécessite une vérification. Vous pouvez continuer, mais certains détails pourraient manquer.`
                });
                setSelectedProductModel(data.scrapedProduct as DisplayableProductModel);
                setStep(2);
            } else if (data.pmError) {
                toast.error("Erreur Standardisation Produit", { description: `Le produit "${data.scrapedProduct?.title || nameForScraping}" a été trouvé mais n'a pas pu être standardisé: ${data.pmError}. Essayez de modifier le nom.` });
                if (data.scrapedProduct) setSelectedProductModel(data.scrapedProduct as DisplayableProductModel);
            } else {
                toast.error("Produit Non Trouvé/Standardisé", { description: `Aucune information pour "${nameForScraping}" n'a pu être trouvée ou standardisée. Veuillez réessayer.` });
            }

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Impossible de récupérer/créer les informations du produit.";
            toast.error("Erreur Création Produit", { description: errorMessage });
        } finally {
            setIsLoadingCreate(false);
            setIsLoadingFullProduct(false);
        }
    };

    const handleOfferDetailsChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setOfferDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleConditionChange = (value: string) => {
        setOfferDetails({ ...offerDetails, condition: value });
    };

    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files).slice(0, 5);
            setOfferDetails({ ...offerDetails, photos: filesArray });
        }
    };

    const handleSubmitOffer = async (e: FormEvent) => {
        e.preventDefault();
        const userId = (session?.user as { id?: string })?.id;
        if (sessionStatus !== 'authenticated' || !userId) {
            toast.error("Authentification Requise", { description: "Veuillez vous connecter." });
            return;
        }
        if (!offerDetails.price || isNaN(parseFloat(offerDetails.price)) || parseFloat(offerDetails.price) <= 0) {
            toast.error("Prix invalide", { description: "Veuillez entrer un prix valide." });
            return;
        }
        if (!selectedProductModel || !selectedProductModel._id) {
            toast.error("Erreur Produit", { description: "Aucun produit ReMarket sélectionné." });
            return;
        }

        setIsLoadingSubmitOffer(true);
        let uploadedPhotoUrls: string[] = [];

        // Étape 1: Uploader les photos si présentes
        if (offerDetails.photos && offerDetails.photos.length > 0) {
            const photoFormData = new FormData();
            for (const photo of offerDetails.photos) {
                photoFormData.append('files', photo);
            }

            try {
                toast.info("Téléversement des images...", { id: "upload-toast" });
                const uploadResponse = await fetch('/api/upload/images', {
                    method: 'POST',
                    body: photoFormData,
                    // Note: Ne pas mettre de 'Content-Type': 'application/json' ici,
                    // le navigateur le mettra automatiquement à 'multipart/form-data' avec la bonne boundary.
                });

                const uploadData = await uploadResponse.json();
                if (!uploadResponse.ok || !uploadData.success) {
                    throw new Error(uploadData.message || "Échec du téléversement des images.");
                }
                uploadedPhotoUrls = uploadData.urls;
                toast.success("Images téléversées !", { id: "upload-toast" });
            } catch (uploadError: unknown) {
                const uploadErrorMessage = uploadError instanceof Error ? uploadError.message : "Erreur inconnue lors du téléversement.";
                toast.error("Erreur Upload Photos", { description: uploadErrorMessage, id: "upload-toast" });
                setIsLoadingSubmitOffer(false);
                return; // Arrêter si l'upload échoue
            }
        }

        // Étape 2: Créer l'offre avec les URLs des photos (ou un tableau vide si aucune photo)
        const payload = {
            productModelId: selectedProductModel._id.toString(),
            price: parseFloat(offerDetails.price),
            currency: offerDetails.currency || 'EUR',
            condition: offerDetails.condition,
            sellerDescription: offerDetails.sellerDescription,
            sellerPhotos: uploadedPhotoUrls, // Utiliser les URLs obtenues ou un tableau vide
            dynamicFields: Array.isArray(offerDetails.dynamicFields) ? offerDetails.dynamicFields : [],
        };

        console.log("[SellPage] Payload de l'offre avant envoi API:", JSON.stringify(payload, null, 2)); // Log détaillé du payload

        try {
            toast.info("Publication de l'offre...", { id: "offer-toast" });
            const response = await fetch('/api/offers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const createdOfferData = await response.json();
            if (!response.ok) {
                throw new Error(createdOfferData.message || `Erreur HTTP: ${response.status}`);
            }
            toast.success("Offre Publiée !", {
                description: `Votre offre pour "${selectedProductModel.title}" à ${createdOfferData.price}€ est en ligne.`,
                action: { label: "Vendre un autre article", onClick: () => resetSellProcess() },
                cancel: { label: "Voir mes offres", onClick: () => router.push('/dashboard/sales') }
            });
            resetSellProcess();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue.";
            toast.error("Erreur Soumission Offre", { description: errorMessage });
        } finally {
            setIsLoadingSubmitOffer(false);
        }
    };

    const displayTitle = selectedProductModel?.title || 'N/A';
    const displayBrand = selectedProductModel?.brand || 'N/A';
    const displayCategory = finalSelectedLeafCategory?.name || selectedProductModel?.category || 'N/A';
    const displayAsin = selectedProductModel && 'asin' in selectedProductModel ? (selectedProductModel as IScrapedProduct).asin : undefined;
    let displayStandardDescription: string | undefined = 'N/A';
    if (selectedProductModel) {
        if ('standardDescription' in selectedProductModel && typeof selectedProductModel.standardDescription === 'string') {
            displayStandardDescription = selectedProductModel.standardDescription;
        } else if ('description' in selectedProductModel && typeof selectedProductModel.description === 'string') {
            displayStandardDescription = selectedProductModel.description;
        }
    }
    let displayImageUrls: string[] = ['/images/placeholder-product.png'];
    if (selectedProductModel) {
        const urls = ('standardImageUrls' in selectedProductModel && Array.isArray(selectedProductModel.standardImageUrls) && selectedProductModel.standardImageUrls.length > 0)
            ? selectedProductModel.standardImageUrls
            : (('imageUrls' in selectedProductModel && Array.isArray(selectedProductModel.imageUrls) && selectedProductModel.imageUrls.length > 0)
                ? selectedProductModel.imageUrls
                : null);
        if (urls) displayImageUrls = urls;
    }

    const prepareDisplayData = () => {
        let displayAttributes: Specifications = [];
        if (selectedProductModel) {
            if ('specifications' in selectedProductModel && Array.isArray((selectedProductModel as IProductModelReMarketType).specifications)) {
                displayAttributes = (selectedProductModel as IProductModelReMarketType).specifications;
            } else if ('attributes' in selectedProductModel && Array.isArray((selectedProductModel as IScrapedProduct).attributes)) {
                displayAttributes = (selectedProductModel as IScrapedProduct).attributes.map(attr => ({ label: attr.label, value: attr.value, unit: attr.unit }));
            }
        }
        return { displayAttributes };
    };
    const { displayAttributes } = prepareDisplayData();
    const conditionOptions = [
        { value: "new", label: "Neuf (jamais utilisé, emballage d'origine)" },
        { value: "used_likenew", label: "Comme neuf (utilisé quelques fois, aucune trace)" },
        { value: "used_good", label: "Bon état (traces d'usure légères)" },
        { value: "used_fair", label: "État correct (traces d'usure visibles, fonctionnel)" },
    ];

    const renderCategoryDropdowns = () => {
        return categoryDropdowns.map((dropdown, index) => (
            <div key={`cat-level-${index}`} className="mb-4">
                <Label htmlFor={`category-level-${index}`}>{dropdown.level === 0 ? "1. Catégorie Principale" : `Sous-catégorie (Niv. ${dropdown.level + 1})`}</Label>
                <Select
                    value={dropdown.selectedId || ''}
                    onValueChange={(value) => handleCategoryLevelSelect(dropdown.level, value)}
                    disabled={isLoadingCategories || (index > 0 && !categoryDropdowns[index - 1]?.selectedId) || isLoadingFullProduct || isLoadingCreate}
                >
                    <SelectTrigger id={`category-level-${index}`} className="bg-input">
                        <SelectValue placeholder={isLoadingCategories && index === 0 ? "Chargement..." : dropdown.placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {dropdown.options.length > 0 ? (
                            dropdown.options.map(cat => (
                                <SelectItem
                                    key={cat._id.toString()}
                                    value={cat._id.toString()}
                                >
                                    {cat.name}
                                </SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-options" disabled>Aucune sous-catégorie</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </div>
        ));
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-0">
            <h1 className="text-3xl font-bold mb-4 text-center">Vendez votre article sur ReMarket</h1>
            <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
                Suivez ces étapes simples pour lister votre produit et toucher des milliers d&apos;acheteurs.
            </p>

            <div className="max-w-2xl mx-auto mb-8">
                <div className="flex justify-between mb-1">
                    <span className={`text-sm font-medium ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>Étape 1: Produit</span>
                    <span className={`text-sm font-medium ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>Étape 2: Offre</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                    <div className={`bg-primary h-2.5 rounded-full transition-all duration-500 ease-out ${step === 1 ? 'w-1/2' : 'w-full'}`}></div>
                </div>
            </div>

            {step === 1 && (
                <Card className="max-w-2xl mx-auto shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center"><CheckCircle className="h-6 w-6 mr-2 text-primary" /> Identifier votre produit</CardTitle>
                        <CardDescription>
                            Sélectionnez la catégorie de votre produit, puis la marque et le modèle précis.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        {renderCategoryDropdowns()}

                        {finalSelectedLeafCategory && (
                            <div>
                                <Label htmlFor="brand">2. Marque</Label>
                                <Select
                                    value={selectedBrandId || ''}
                                    onValueChange={handleSelectBrand}
                                    disabled={!finalSelectedLeafCategory || isLoadingBrands || isLoadingFullProduct || isLoadingCreate}
                                >
                                    <SelectTrigger id="brand" className="bg-input">
                                        <SelectValue placeholder={isLoadingBrands ? "Chargement..." : "Sélectionnez une marque"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {brands.length > 0 ? (
                                            brands.map(brand => (
                                                <SelectItem key={brand.slug} value={brand.slug}>{brand.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-brand" disabled>{isLoadingBrands ? "Chargement..." : "Aucune marque disponible"}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {finalSelectedLeafCategory && selectedBrandId && (
                            <div>
                                <Label htmlFor="productModelReMarket">3. Modèle de produit ReMarket</Label>
                                <Select
                                    value={selectedProductModelReMarketId || ''}
                                    onValueChange={handleSelectProductModelReMarket}
                                    disabled={isLoadingProductModels || isLoadingFullProduct || isLoadingCreate}
                                >
                                    <SelectTrigger id="productModelReMarket" className="bg-input">
                                        <SelectValue placeholder={isLoadingProductModels ? "Chargement..." : (isLoadingFullProduct ? "Vérification..." : "Sélectionnez ou créez produit")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productModelsReMarketSelectItems.length > 0 ? (
                                            productModelsReMarketSelectItems.map(pm => (
                                                <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-pm" disabled>{isLoadingProductModels ? "Chargement..." : "Aucun produit (ou créez-en un)"}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showCreateByName && selectedBrandId && finalSelectedLeafCategory && (
                            <Card className="mt-6 bg-muted/50 p-4 sm:p-6 border-dashed">
                                <CardHeader className="p-0 mb-3">
                                    <CardTitle className="text-lg">Nouveau Produit ReMarket</CardTitle>
                                    <CardDescription>
                                        Votre produit n&apos;est pas listé ? Décrivez-le. La marque <span className="font-semibold text-primary">{brands.find(b => b.slug === selectedBrandId)?.name || ''}</span> sera ajoutée.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <form onSubmit={handleScrapeNewProductModel} className="space-y-4">
                                        <div>
                                            <Label htmlFor="newProductModelName">Nom précis du produit (modèle, couleur, capacité...)</Label>
                                            <Input
                                                id="newProductModelName"
                                                type="text"
                                                value={newProductModelName}
                                                onChange={(e) => setNewProductModelName(e.target.value)}
                                                placeholder={`Ex: Galaxy S22 Ultra 256Go Noir (sans la marque)`}
                                                disabled={isLoadingCreate || isLoadingFullProduct}
                                                className="bg-background"
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            className="w-full sm:w-auto"
                                            disabled={isLoadingCreate || isLoadingFullProduct || !newProductModelName.trim() || !finalSelectedLeafCategory?.slug || !selectedBrandId}
                                        >
                                            {isLoadingCreate || isLoadingFullProduct ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                                            {isLoadingCreate ? 'Recherche en cours...' : (isLoadingFullProduct ? 'Finalisation...' : 'Rechercher et Créer Produit')}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                    <CardFooter className="pt-6">
                        {selectedProductModel && selectedProductModelReMarketId !== NOT_LISTED_ID && !isLoadingFullProduct && (
                            <Button onClick={() => setStep(2)} className="w-full" >
                                <ArrowRight className="mr-2 h-4 w-4" />Continuer vers l&apos;offre
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            )}

            {step === 2 && selectedProductModel && (
                <Card className="max-w-2xl mx-auto shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center"><CheckCircle className="h-6 w-6 mr-2 text-primary" /> Décrire votre offre</CardTitle>
                        <CardDescription>
                            Produit ReMarket : <span className="font-semibold text-foreground">{displayTitle}</span> par <span className="font-semibold text-foreground">{displayBrand}</span>.
                            {displayAsin && <span className="text-xs text-muted-foreground block">Référence source (ASIN): {displayAsin}</span>}
                        </CardDescription>
                    </CardHeader>
                    <form id="offerForm" onSubmit={handleSubmitOffer}>
                        <CardContent className="space-y-6 pt-6">
                            <div>
                                <Label htmlFor="price">Votre Prix de Vente (€) <span className="text-destructive">*</span></Label>
                                <Input id="price" name="price" type="number" value={offerDetails.price} onChange={handleOfferDetailsChange} placeholder="Ex: 450.00" required className="bg-input" />
                            </div>
                            <div>
                                <Label htmlFor="condition">État de votre article <span className="text-destructive">*</span></Label>
                                <Select value={offerDetails.condition} onValueChange={handleConditionChange}>
                                    <SelectTrigger id="condition" className="bg-input"><SelectValue placeholder="Sélectionnez l'état" /></SelectTrigger>
                                    <SelectContent>
                                        {conditionOptions.map(opt => (
                                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="sellerDescription">Description de votre offre (optionnel)</Label>
                                <Textarea id="sellerDescription" name="sellerDescription" value={offerDetails.sellerDescription} onChange={handleOfferDetailsChange} placeholder="Ex: Vendu avec boîte d&apos;origine..." rows={4} className="bg-input" />
                                <p className="text-xs text-muted-foreground mt-1">Soyez précis pour éviter les surprises !</p>
                            </div>
                            <Card className="bg-muted/30 p-4">
                                <CardHeader className="p-0 mb-2"><CardTitle className="text-base">Rappel du produit ReMarket</CardTitle></CardHeader>
                                <CardContent className="p-0 flex flex-col sm:flex-row gap-4 items-start">
                                    <Image src={displayImageUrls[0]} alt={displayTitle || 'Image produit'} width={100} height={100} className="w-24 h-24 object-contain rounded-md border bg-background flex-shrink-0" />
                                    <div className="text-xs space-y-1">
                                        <p><span className="font-medium">Titre:</span> {displayTitle}</p>
                                        <p><span className="font-medium">Marque:</span> {displayBrand}</p>
                                        <p><span className="font-medium">Catégorie:</span> {displayCategory}</p>
                                        {displayStandardDescription && <p className="truncate-3-lines"><span className="font-medium">Description std.:</span> {displayStandardDescription}</p>}
                                        {displayAttributes && displayAttributes.length > 0 && (
                                            <details className="mt-1"><summary className="cursor-pointer text-primary hover:underline">Afficher les {displayAttributes.length} spécifications</summary>
                                                <ul className="mt-1 list-disc pl-5 text-muted-foreground max-h-24 overflow-y-auto">
                                                    {displayAttributes.map((attr: AttributeItem) => (<li key={attr.label}>{attr.label}: {attr.value}{attr.unit ? ` ${attr.unit}` : ''}</li>))}
                                                </ul>
                                            </details>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                            <div>
                                <Label htmlFor="photos">Vos photos de l&apos;article (jusqu&apos;à 5)</Label>
                                <Input id="photos" name="photos" type="file" multiple onChange={handlePhotoChange} accept="image/jpeg, image/png, image/webp" className="bg-input" />
                                {offerDetails.photos.length > 0 && (
                                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
                                        {offerDetails.photos.map((file, index) => (<div key={index} className="relative aspect-square"><Image src={URL.createObjectURL(file)} alt={`Photo ${index + 1}`} fill className="object-cover rounded-md" /></div>))}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground mt-1">Important pour prouver l&apos;état et rassurer les acheteurs.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6">
                            <Button variant="outline" onClick={() => setStep(1)} type="button"><ArrowLeft className="mr-2 h-4 w-4" /> Précédent</Button>
                            <Button type="submit" form="offerForm" disabled={isLoadingSubmitOffer || sessionStatus !== 'authenticated'} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                                {isLoadingSubmitOffer ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                {isLoadingSubmitOffer ? "Publication en cours..." : "Publier mon offre"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            )}
        </div>
    );
}