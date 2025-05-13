'use client';

import React from 'react';

import { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from "sonner";
import type { IScrapedProduct } from '@/models/ScrapedProduct';
import type { IProductModel as IProductModelReMarketType } from '@/models/ProductModel'; // Type pour nos ProductModel standardisés
import { useSession } from "next-auth/react"; // Ajout de l'import
import type {
    Category,
    Brand,
    ProductModelReMarketSelectItem,
    OfferDetails,
    DisplayableProductModel,
    AttributeItem,
    Specifications
} from './types';

const NOT_LISTED_ID = "---PRODUCT_NOT_LISTED---"; // ID pour l'option "Non listé"

export default function SellPage() {
    const [step, setStep] = useState(1);
    const { data: session, status: sessionStatus } = useSession(); // Ajout de useSession

    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedCategorySlug, setSelectedCategorySlug] = useState<string | null>(null); // État pour le slug
    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const [productModelsReMarketSelectItems, setProductModelsReMarketSelectItems] = useState<ProductModelReMarketSelectItem[]>([]);
    const [selectedProductModelReMarketId, setSelectedProductModelReMarketId] = useState<string | null>(null);

    const [showCreateByName, setShowCreateByName] = useState(false);
    const [newProductModelName, setNewProductModelName] = useState('');

    // selectedProductModel stockera le produit à afficher à l'étape 2.
    // Il devrait être de type IProductModelReMarketType (ou compatible) pour l'affichage des détails standardisés.
    const [selectedProductModel, setSelectedProductModel] = useState<DisplayableProductModel | null>(null);

    const [offerDetails, setOfferDetails] = useState<OfferDetails>({
        price: '',
        condition: 'used_good',
        sellerDescription: '',
        photos: [],
        dynamicFields: {},
    });

    const [isLoadingCategories, setIsLoadingCategories] = useState(false);
    const [isLoadingBrands, setIsLoadingBrands] = useState(false);
    const [isLoadingProductModels, setIsLoadingProductModels] = useState(false);
    const [isLoadingCreate, setIsLoadingCreate] = useState(false);
    const [isLoadingFullProduct, setIsLoadingFullProduct] = useState(false);
    const [isLoadingSubmitOffer, setIsLoadingSubmitOffer] = useState(false); // Nouvel état pour le chargement de la soumission de l'offre

    // J'ajoute l'état pour la modal de confirmation et la fonction de réinitialisation
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const resetSellProcess = () => {
        setStep(1);
        setSelectedCategoryId(null);
        setSelectedCategorySlug(null);
        setSelectedBrandId(null);
        setBrands([]);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModelReMarketId(null);
        setSelectedProductModel(null);
        setShowCreateByName(false);
        setNewProductModelName('');
        setOfferDetails({ price: '', condition: 'used_good', sellerDescription: '', photos: [], dynamicFields: {} });
    };

    useEffect(() => {
        setIsLoadingCategories(true);
        fetch('/api/categories')
            .then(res => {
                if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
                return res.json();
            })
            .then((data: { categories: Category[] } | Category[]) => {
                if (data && 'categories' in data && Array.isArray(data.categories)) {
                    setCategories(data.categories);
                } else if (Array.isArray(data)) {
                    setCategories(data);
                } else {
                    setCategories([]);
                    console.warn("Structure de données des catégories inattendue reçue:", data);
                    toast.info("Info Catégories", { description: "Aucune catégorie trouvée ou format de données incorrect." });
                }
            })
            .catch(err => {
                console.error("Erreur chargement catégories:", err);
                toast.error("Erreur Catégories", { description: err.message || "Impossible de charger les catégories." });
                setCategories([]);
            })
            .finally(() => setIsLoadingCategories(false));
    }, []);

    useEffect(() => {
        if (selectedCategorySlug) {
            setIsLoadingBrands(true);
            setBrands([]);
            setSelectedBrandId(null);
            setProductModelsReMarketSelectItems([]);
            setSelectedProductModelReMarketId(null);
            setShowCreateByName(false);
            fetch(`/api/brands?categoryId=${selectedCategorySlug}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
                    return res.json();
                })
                .then((data: Brand[] | { message: string }) => {
                    if (Array.isArray(data)) {
                        setBrands(data);
                        if (data.length === 0) {
                            toast.info("Info Marques", { description: "Aucune marque trouvée pour cette catégorie." });
                        }
                    } else {
                        setBrands([]);
                        toast.info("Info Marques", { description: (data as { message: string }).message || "Aucune marque trouvée." });
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
    }, [selectedCategorySlug]);

    useEffect(() => {
        if (selectedCategorySlug && selectedBrandId) {
            setIsLoadingProductModels(true);
            setProductModelsReMarketSelectItems([]);
            setSelectedProductModelReMarketId(null);
            setShowCreateByName(false);
            fetch(`/api/product-models?categoryId=${selectedCategorySlug}&brandId=${selectedBrandId}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Erreur HTTP: ${res.status}`);
                    return res.json();
                })
                .then((data: ProductModelReMarketSelectItem[] | { message: string }) => {
                    let items: ProductModelReMarketSelectItem[] = [];
                    if (Array.isArray(data)) {
                        items = data;
                    } else if (data && (data as { message: string }).message) {
                        // Laisser items vide, l'option "Non listé" sera ajoutée
                        // toast.info("Info Produits", { description: (data as { message: string }).message || "Aucun produit ReMarket existant. Vous pouvez en créer un via Amazon." });
                    }

                    const notListedOption: ProductModelReMarketSelectItem = {
                        id: NOT_LISTED_ID,
                        name: "Mon produit n'est pas listé / Créer un nouveau",
                    };
                    setProductModelsReMarketSelectItems([...items, notListedOption]);

                    // if (items.length === 0) {
                    //     toast.info("Info Produits", { description: "Aucun produit ReMarket existant. Sélectionnez l'option pour en créer un." });
                    // }
                })
                .catch(err => {
                    console.error("Erreur chargement ProductModels:", err);
                    toast.error("Erreur Produits", { description: err.message || "Impossible de charger les produits." });
                    // Même en cas d'erreur, on propose de créer
                    const notListedOption: ProductModelReMarketSelectItem = {
                        id: NOT_LISTED_ID,
                        name: "Mon produit n'est pas listé / Créer un nouveau",
                    };
                    setProductModelsReMarketSelectItems([notListedOption]);
                })
                .finally(() => setIsLoadingProductModels(false));
        } else {
            setProductModelsReMarketSelectItems([]);
            setSelectedProductModelReMarketId(null);
        }
    }, [selectedCategorySlug, selectedBrandId]);


    const handleSelectCategory = (categoryId: string) => {
        const selectedCat = categories.find(cat => cat._id === categoryId);
        setSelectedCategoryId(categoryId);
        setSelectedCategorySlug(selectedCat ? selectedCat.slug : null);

        setSelectedBrandId(null);
        setBrands([]);
        setSelectedProductModelReMarketId(null);
        setProductModelsReMarketSelectItems([]);
        setSelectedProductModel(null);
        setShowCreateByName(false);
    };

    const handleSelectBrand = (brandId: string) => {
        setSelectedBrandId(brandId);
        setSelectedProductModelReMarketId(null);
        setProductModelsReMarketSelectItems([]); // Sera rempli par le useEffect
        setSelectedProductModel(null);
        setShowCreateByName(false);
    };

    const handleSelectProductModelReMarket = async (productModel_Id: string) => {
        setSelectedProductModelReMarketId(productModel_Id);

        if (productModel_Id === NOT_LISTED_ID) {
            setShowCreateByName(true);
            setSelectedProductModel(null);
            const currentBrand = brands.find(b => b.id === selectedBrandId);
            setNewProductModelName(currentBrand ? `${currentBrand.name} ` : '');
            setIsLoadingFullProduct(false);
            return;
        }

        setShowCreateByName(false);
        setIsLoadingFullProduct(true);
        try {
            // Cette route devrait maintenant retourner un ProductModel (avec un statut)
            const response = await fetch(`/api/product-models/${productModel_Id}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
            }
            // Supposons que ceci est toujours un IProductModelReMarketType après les modifs serveur
            const fullProductModel = (await response.json()) as IProductModelReMarketType & { _id: string };

            setSelectedProductModel(fullProductModel);

            setStep(2);
            toast.success("Modèle ReMarket sélectionné", { description: fullProductModel.title });

        } catch (error: unknown) {
            console.error("Erreur chargement détails ProductModel ReMarket:", error);
            const errorMessage = error instanceof Error ? error.message : "Impossible de charger les détails du produit.";
            toast.error("Erreur Chargement Produit", { description: errorMessage });
            setSelectedProductModelReMarketId(null); // Désélectionner en cas d'erreur
        }
        setIsLoadingFullProduct(false);
    };

    const handleScrapeNewProductModel = async (e: FormEvent) => {
        e.preventDefault();
        const trimmedNewProductModelName = newProductModelName.trim();
        if (!trimmedNewProductModelName) {
            toast.error("Nom manquant", { description: "Veuillez entrer un nom pour le produit à rechercher." });
            return;
        }
        const currentBrand = brands.find(b => b.id === selectedBrandId);
        if (!selectedCategorySlug || !selectedBrandId || !currentBrand) {
            toast.error("Sélection manquante", { description: "Veuillez sélectionner une catégorie et une marque valides." });
            return;
        }
        setIsLoadingCreate(true);
        setSelectedProductModel(null);

        try {
            let nameForScraping = trimmedNewProductModelName;
            if (!trimmedNewProductModelName.toLowerCase().startsWith(currentBrand.name.toLowerCase())) {
                nameForScraping = `${currentBrand.name} ${trimmedNewProductModelName}`;
            }

            const response = await fetch('/api/product-models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: nameForScraping,
                    categoryId: selectedCategorySlug,
                    brandId: selectedBrandId
                }),
            });

            // La réponse contient maintenant scrapedProduct et productModel (ou null/erreur)
            const data: {
                scrapedProduct: IScrapedProduct & { _id: string };
                productModel: (IProductModelReMarketType & { _id: string; /* status: string; */ title: string }) | null;
                pmError?: string
            } | { message: string; error?: string } = await response.json();

            if (!response.ok) {
                const errorMsg = (data as { message: string }).message || `Erreur ${response.status}`;
                throw new Error(errorMsg);
            }

            // Vérifier si la structure de data est celle attendue (avec scrapedProduct)
            if (!('scrapedProduct' in data)) {
                throw new Error("Réponse inattendue de l'API après scraping.");
            }

            const { scrapedProduct, productModel, pmError } = data;

            if (pmError) {
                toast.error("Erreur Traitement Produit", { description: `Le produit a été scrapé mais une erreur est survenue lors de sa standardisation: ${pmError}. Veuillez contacter le support.` });
                // On peut afficher le scrapedProduct à titre informatif si on le souhaite
                setSelectedProductModel(scrapedProduct);
                // Ne pas passer à l'étape 2 car le ProductModel n'est pas prêt
                setIsLoadingCreate(false);
                return;
            }

            if (!productModel) {
                toast.error("Erreur Produit Standardisé", { description: "Le produit a été scrapé mais n'a pas pu être standardisé correctement. Veuillez réessayer ou contacter le support." });
                setSelectedProductModel(scrapedProduct); // Afficher le scrapé pour info
                setIsLoadingCreate(false);
                return;
            }

            // Utiliser les infos du ProductModel (qui vient d'être créé/mis à jour) pour l'affichage
            // On caste ici car productModel de l'API est un sous-ensemble, mais on a besoin de la structure complète pour l'affichage.
            // Il est préférable que l'API retourne tous les champs nécessaires pour IProductModelReMarketType
            // ou que l'on fasse un fetch séparé du ProductModel complet par son ID ici.
            // Pour l'instant, on va chercher le ProductModel complet pour s'assurer d'avoir toutes les données.

            setIsLoadingFullProduct(true); // Pour charger le ProductModel complet
            try {
                const pmResponse = await fetch(`/api/product-models/${productModel._id}`);
                if (!pmResponse.ok) {
                    const errorData = await pmResponse.json();
                    throw new Error(errorData.message || `Erreur HTTP: ${pmResponse.status} en chargeant le ProductModel complet`);
                }
                const fullProductModelForDisplay = (await pmResponse.json()) as IProductModelReMarketType & { _id: string /*, status: string */ };
                setSelectedProductModel(fullProductModelForDisplay);
                setStep(2);

                toast.success("Informations produit récupérées !", {
                    description: `Les informations pour "${fullProductModelForDisplay.title}" sont prêtes.`,
                });

            } catch (fetchPmError: unknown) {
                console.error("Erreur chargement ProductModel complet après scraping:", fetchPmError);
                const errorMessage = fetchPmError instanceof Error ? fetchPmError.message : "Impossible de charger les détails complets du produit.";
                toast.error("Erreur Chargement Détails", { description: errorMessage });
                setSelectedProductModel(productModel); // Fallback: afficher les infos partielles du PM reçues initialement
                setStep(2); // On passe quand même à l'étape 2 pour afficher ce qu'on a
            } finally {
                setIsLoadingFullProduct(false);
            }

        } catch (error: unknown) {
            console.error("Erreur lors de la création/scraping du modèle de produit:", error);
            const errorMessage = error instanceof Error ? error.message : "Impossible de récupérer les informations du produit.";
            toast.error("Erreur Scraping Produit", { description: errorMessage });
        }
        setIsLoadingCreate(false);
    };

    const handleOfferDetailsChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setOfferDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleDynamicFieldChange = (fieldName: string, value: string | number | boolean) => {
        setOfferDetails(prev => ({
            ...prev,
            dynamicFields: {
                ...prev.dynamicFields,
                [fieldName]: value,
            }
        }));
    };

    const handleConditionChange = (value: string) => {
        setOfferDetails({ ...offerDetails, condition: value });
    };

    const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setOfferDetails({ ...offerDetails, photos: Array.from(e.target.files) });
        }
    };

    const handleSubmitOffer = async (e: FormEvent) => {
        e.preventDefault();
        // Logs ajoutés ici pour inspection initiale
        console.log('[VENDE PAGE LOG] handleSubmitOffer triggered. État actuel:', { selectedProductModel, offerDetails });

        // Log de session
        console.log('[VENDE PAGE LOG] Session status:', sessionStatus);
        console.log('[VENDE PAGE LOG] Session data:', session);

        if (sessionStatus !== 'authenticated') {
            toast.error("Non authentifié", { description: "Votre session a peut-être expiré. Veuillez rafraîchir la page ou vous reconnecter." });
            setIsLoadingSubmitOffer(false); // S'assurer de réinitialiser le loader
            return;
        }

        // Validations JavaScript Rétablis
        if (!offerDetails.price || isNaN(parseFloat(offerDetails.price)) || parseFloat(offerDetails.price) <= 0) {
            toast.error("Prix invalide", { description: "Veuillez entrer un prix valide pour votre article." });
            return;
        }
        // La validation des photos est importante, mais l'upload n'est pas encore géré.
        // Pour l'instant, on peut la commenter ou exiger au moins un fichier si la logique d'envoi de fichiers est partiellement en place.
        if (offerDetails.photos.length === 0) {
            // Temporairement, laissons cette validation commentée si l'upload n'est pas prêt.
            // toast.error("Photos manquantes", { description: "Veuillez ajouter au moins une photo de votre article." });
            // return;
            console.warn("Validation des photos désactivée car l'upload n'est pas finalisé. SellerPhotos sera envoyé vide.");
        }

        // Validation selectedProductModel et son titre
        if (!selectedProductModel) {
            console.error('[VENDE PAGE LOG] ERREUR: selectedProductModel est null ou undefined.');
            toast.error("Erreur Produit", { description: "Le produit sélectionné est manquant. Veuillez réessayer." });
            return;
        }

        const currentProductTitle = selectedProductModel.title; // Rétabli
        if (typeof currentProductTitle !== 'string' || !currentProductTitle) {
            console.error('[VENDE PAGE LOG] ERREUR: Le titre du produit est manquant, non une chaîne, ou vide.', selectedProductModel);
            toast.error("Erreur Produit", { description: "Les informations du produit (titre) sont incomplètes. Veuillez réessayer." });
            return;
        }

        if (!selectedProductModel._id) { // Validation de _id déjà présente dans le code fourni par l'IA.
            console.error('[VENDE PAGE LOG] ERREUR: selectedProductModel ou son _id est manquant AVANT payload.');
            toast.error("Erreur Produit Critique", { description: "Impossible de déterminer l'ID du produit sélectionné." });
            return;
        }
        const productModelIdToSubmit = selectedProductModel._id;

        console.log('[VENDE PAGE LOG] Validations passées. Préparation du payload pour API /api/offers...'); // Remis à sa place
        console.log('[VENDE PAGE LOG] Selected Product Model for offer:', JSON.stringify(selectedProductModel, null, 2));

        const payload = {
            productModelId: productModelIdToSubmit.toString(),
            price: parseFloat(offerDetails.price),
            condition: offerDetails.condition,
            sellerDescription: offerDetails.sellerDescription,
            sellerPhotos: [], // L'API s'attend à sellerPhotos, on envoie un tableau vide car l'upload n'est pas géré.
            // quantity: 1, // L'API /api/offers utilise body.quantity || 1, donc pas besoin de l'envoyer explicitement si c'est 1
            // dynamicFields: offerDetails.dynamicFields, // L'API /api/offers ne gère pas dynamicFields directement dans son body pour l'instant
        };
        console.log('[VENDE PAGE LOG] Payload to be sent to /api/offers:', JSON.stringify(payload, null, 2));

        setIsLoadingSubmitOffer(true);

        try {
            const response = await fetch('/api/offers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
                }
                throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
            }

            const createdOffer = await response.json();
            toast.success("Offre Soumise avec Succès!", {
                description: `Votre offre pour "${createdOffer.condition}" de ${currentProductTitle} à ${createdOffer.price}€ a été enregistrée.` // Utilisation de currentProductTitle
            });

            setStep(1);
            setSelectedCategoryId(null);
            setSelectedBrandId(null);
            setBrands([]);
            setSelectedProductModelReMarketId(null);
            setProductModelsReMarketSelectItems([]);
            setSelectedProductModel(null);
            setShowCreateByName(false);
            setNewProductModelName('');
            setOfferDetails({ price: '', condition: 'used_good', sellerDescription: '', photos: [], dynamicFields: {} });

        } catch (error: unknown) {
            console.error("Erreur lors de la soumission de l'offre:", error);
            const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de la soumission.";
            toast.error("Erreur Soumission Offre", { description: errorMessage });
        } finally {
            setIsLoadingSubmitOffer(false);
        }
    };

    // Affichage de la marque et catégorie pour l'étape 2
    const displayTitle = selectedProductModel?.title || 'Produit Inconnu';
    const displayBrand = selectedProductModel?.brand || 'N/A';
    const displayCategory = selectedProductModel?.category || 'N/A'; // Sur IProductModel, c'est le slug. Sur IScrapedProduct, c'est une string.

    // ASIN est spécifique à IScrapedProduct
    const displayAsin = selectedProductModel && 'asin' in selectedProductModel ? (selectedProductModel as IScrapedProduct).asin : undefined;

    let displayStandardDescription: string | undefined = 'N/A';
    if (selectedProductModel) {
        if ('standardDescription' in selectedProductModel) {
            displayStandardDescription = (selectedProductModel as IProductModelReMarketType).standardDescription;
        } else if ('description' in selectedProductModel) {
            displayStandardDescription = (selectedProductModel as IScrapedProduct).description;
        }
    }

    let displayImageUrls: string[] = [];
    if (selectedProductModel) {
        if ('standardImageUrls' in selectedProductModel && Array.isArray((selectedProductModel as IProductModelReMarketType).standardImageUrls)) {
            displayImageUrls = (selectedProductModel as IProductModelReMarketType).standardImageUrls;
        } else if ('imageUrls' in selectedProductModel && Array.isArray((selectedProductModel as IScrapedProduct).imageUrls)) {
            displayImageUrls = (selectedProductModel as IScrapedProduct).imageUrls;
        }
    }

    // Pour les attributs/spécifications, la structure est { label: string, value: string }
    // IProductModelReMarketType -> specifications: IStandardSpecification[]
    // IScrapedProduct -> attributes: IProductAttribute[]
    // Les deux ont label/value, donc on peut les unifier si nécessaire ou les traiter séparément.
    // Ici, on choisit l'un ou l'autre.
    const prepareDisplayData = () => {
        let displayAttributes: Specifications = [];
        if (selectedProductModel) {
            if ('specifications' in selectedProductModel && Array.isArray((selectedProductModel as IProductModelReMarketType).specifications)) {
                displayAttributes = (selectedProductModel as IProductModelReMarketType).specifications;
            } else if ('attributes' in selectedProductModel && Array.isArray((selectedProductModel as IScrapedProduct).attributes)) {
                // IProductAttribute n'a pas 'unit', donc il faut mapper si on veut un type unifié complet.
                // Pour l'instant, on les garde compatibles avec la structure de IStandardSpecification.
                displayAttributes = (selectedProductModel as IScrapedProduct).attributes.map(attr => ({ label: attr.label, value: attr.value }));
            }
        }
        return { displayAttributes };
    };

    const { displayAttributes } = prepareDisplayData();

    return (
        <div>
            <div className="container mx-auto py-8 px-4 md:px-0">
                <h1 className="text-3xl font-bold mb-8 text-center">Vendez votre article</h1>

                {step === 1 && (
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>Étape 1 : Identifier votre produit</CardTitle>
                            <CardDescription>
                                Sélectionnez la catégorie, la marque, puis votre produit s&apos;il est déjà listé.
                                Sinon, vous pourrez fournir un nom pour récupérer ses informations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label htmlFor="category">Catégorie</Label>
                                <Select
                                    value={selectedCategoryId || ''}
                                    onValueChange={handleSelectCategory}
                                    disabled={isLoadingCategories || isLoadingFullProduct}
                                >
                                    <SelectTrigger id="category">
                                        <SelectValue placeholder={isLoadingCategories ? "Chargement..." : "Sélectionnez une catégorie"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.isArray(categories) && categories.length > 0 ? (
                                            categories.map(cat => (
                                                <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="no-categories" disabled>
                                                {isLoadingCategories ? "Chargement..." : "Aucune catégorie disponible"}
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedCategoryId && (
                                <div>
                                    <Label htmlFor="brand">Marque</Label>
                                    <Select
                                        value={selectedBrandId || ''}
                                        onValueChange={handleSelectBrand}
                                        disabled={!selectedCategoryId || isLoadingBrands || isLoadingFullProduct}
                                    >
                                        <SelectTrigger id="brand">
                                            <SelectValue placeholder={isLoadingBrands ? "Chargement..." : "Sélectionnez une marque"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {brands.map(brand => (
                                                <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {selectedBrandId && !isLoadingProductModels && (
                                <div>
                                    <Label htmlFor="productModelReMarket">Produit ReMarket</Label>
                                    <Select
                                        value={selectedProductModelReMarketId || ''}
                                        onValueChange={handleSelectProductModelReMarket}
                                        disabled={isLoadingFullProduct}
                                    >
                                        <SelectTrigger id="productModelReMarket">
                                            <SelectValue placeholder={isLoadingProductModels ? "Chargement des produits..." : (isLoadingFullProduct ? "Chargement du produit..." : "Sélectionnez votre produit ou créez-le")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {productModelsReMarketSelectItems.map(pm => (
                                                <SelectItem key={pm.id} value={pm.id}>{pm.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {/* Le formulaire de création manuelle s'affiche si showCreateByName est true */}
                            {showCreateByName && selectedBrandId && !isLoadingFullProduct && (
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Précisez le nom de votre produit spécifique pour récupérer ses informations depuis Amazon.
                                        La marque &quot;{brands.find(b => b.id === selectedBrandId)?.name || ''}&quot; sera automatiquement ajoutée.
                                    </p>
                                    <form onSubmit={handleScrapeNewProductModel} className="space-y-4">
                                        <div>
                                            <Label htmlFor="newProductModelName">Nom du produit (modèle, couleur, capacité...)</Label>
                                            <Input
                                                id="newProductModelName"
                                                type="text"
                                                value={newProductModelName}
                                                onChange={(e) => setNewProductModelName(e.target.value)}
                                                placeholder={`Ex: iPhone 14 Pro Max 256Go Violet (sans la marque)`}
                                                disabled={isLoadingCreate}
                                            />
                                        </div>
                                        <Button
                                            type="submit"
                                            disabled={isLoadingCreate || !newProductModelName.trim()}
                                        >
                                            {isLoadingCreate ? 'Récupération Amazon...' : 'Rechercher sur Amazon et continuer'}
                                        </Button>
                                    </form>
                                </div>
                            )}
                            {/* Suppression de l'ancien bouton "Mon produit n'est pas dans cette liste" */}
                        </CardContent>
                    </Card>
                )}

                {step === 2 && selectedProductModel && (
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>Étape 2 : Détails de votre offre</CardTitle>
                            <CardDescription>
                                Vous vendez : <span className="font-semibold">{displayTitle}</span> ({displayBrand})
                                {displayAsin && <span className="text-xs text-muted-foreground block">ASIN: {displayAsin}</span>}
                            </CardDescription>
                        </CardHeader>
                        <form id="offerForm" onSubmit={handleSubmitOffer}>
                            <CardContent className="space-y-6">
                                <div>
                                    <Label htmlFor="price">Prix (€)</Label>
                                    <Input
                                        id="price"
                                        name="price"
                                        type="number"
                                        value={offerDetails.price}
                                        onChange={handleOfferDetailsChange}
                                        placeholder="Ex: 450"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="condition">État de l&apos;article</Label>
                                    <Select name="condition" value={offerDetails.condition} onValueChange={handleConditionChange}>
                                        <SelectTrigger id="condition">
                                            <SelectValue placeholder="Sélectionnez l&apos;état" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">Neuf (jamais utilisé, emballage d&apos;origine)</SelectItem>
                                            <SelectItem value="used_likenew">Comme neuf (utilisé quelques fois, aucune trace)</SelectItem>
                                            <SelectItem value="used_good">Bon état (traces d&apos;usure légères)</SelectItem>
                                            <SelectItem value="used_fair">État correct (traces d&apos;usure visibles, fonctionnel)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {displayCategory?.toLowerCase().includes('phone') && (
                                    <div>
                                        <Label htmlFor="battery_capacity">Capacité de batterie (%) - Exemple</Label>
                                        <Input
                                            id="battery_capacity"
                                            name="battery_capacity"
                                            type="number"
                                            placeholder="Ex: 95"
                                            onChange={(e) => handleDynamicFieldChange('batteryCapacity', parseInt(e.target.value))}
                                        />
                                    </div>
                                )}
                                {displayCategory?.toLowerCase().includes('ordinateur') && (
                                    <div>
                                        <Label htmlFor="processor">Processeur - Exemple</Label>
                                        <Input
                                            id="processor"
                                            name="processor"
                                            type="text"
                                            placeholder="Ex: Intel Core i7, Apple M2..."
                                            onChange={(e) => handleDynamicFieldChange('processor', e.target.value)}
                                        />
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="sellerDescription">Description personnelle de votre article (optionnel)</Label>
                                    <Textarea
                                        id="sellerDescription"
                                        name="sellerDescription"
                                        value={offerDetails.sellerDescription}
                                        onChange={handleOfferDetailsChange}
                                        placeholder="Décrivez l'état spécifique de VOTRE article, les accessoires inclus, éventuels défauts cosmétiques etc."
                                        rows={4}
                                    />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Informations de base pour &quot;{displayTitle}&quot;:</h4>
                                    {displayImageUrls && displayImageUrls.length > 0 && (
                                        <Image src={displayImageUrls[0]} alt={displayTitle || 'Image produit'} width={160} height={160} className="max-h-40 w-auto object-contain rounded-md border mb-2" />
                                    )}
                                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                        Marque: {displayBrand}<br />
                                        Catégorie: {displayCategory}<br />
                                        Description standard: {displayStandardDescription}
                                    </p>
                                    {displayAttributes && Array.isArray(displayAttributes) && displayAttributes.length > 0 && (
                                        <details className="text-xs mt-2">
                                            <summary className="cursor-pointer">Voir les {displayAttributes.length} spécifications techniques (si récupérées)</summary>
                                            <ul className="mt-1 list-disc pl-4 bg-muted p-2 rounded-md max-h-32 overflow-y-auto">
                                                {displayAttributes.map((attr: AttributeItem) => (
                                                    <li key={attr.label}>{attr.label}: {attr.value}{attr.unit ? ` ${attr.unit}` : ''}</li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="photos">Vos photos de l&apos;article (pour l&apos;envoi)</Label>
                                    <Input
                                        id="photos"
                                        name="photos"
                                        type="file"
                                        multiple
                                        onChange={handlePhotoChange}
                                        accept="image/*"
                                    />
                                    {offerDetails.photos.length > 0 && (
                                        <div className="mt-2 text-sm text-muted-foreground">
                                            {offerDetails.photos.length} photo(s) sélectionnée(s).
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">Ces photos sont importantes pour prouver l&apos;état de votre article avant envoi.</p>
                                </div>

                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="outline" onClick={() => {
                                    setStep(1);
                                    setSelectedProductModel(null);
                                    setSelectedProductModelReMarketId(null); // Aussi réinitialiser l'ID sélectionné de la liste
                                    setShowCreateByName(false);
                                    setNewProductModelName('');
                                }}>Précédent</Button>
                                <div className="flex flex-col items-end">
                                    <Button
                                        type="submit"
                                        form="offerForm"
                                        disabled={isLoadingSubmitOffer}
                                    >
                                        {isLoadingSubmitOffer ? "Soumission en cours..." : "Soumettre l'offre"}
                                    </Button>
                                </div>
                            </CardFooter>
                        </form>
                    </Card>
                )} {/* Fin du rendu conditionnel pour step === 2 */}
            </div> {/* Fin du div container mx-auto */}
            {/* Modal de confirmation */}
            {showConfirmationModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl">
                        <h2 className="text-xl font-semibold mb-4">Vente enregistrée !</h2>
                        <p className="mb-4">Votre article a été mis en vente avec succès.</p>
                        <p className="mb-4">Vous recevrez une notification dès qu&apos;il sera vendu.</p>
                        <Button onClick={() => {
                            setShowConfirmationModal(false);
                            resetSellProcess(); // Optionnel: réinitialiser le formulaire
                        }}>
                            Fermer
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
} // Fin de la fonction SellPage