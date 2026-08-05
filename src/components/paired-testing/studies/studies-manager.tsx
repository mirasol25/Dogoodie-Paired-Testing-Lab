"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Check, ChevronLeft, ChevronRight, LocateFixed, LoaderCircle, MapPin, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { createStudyAction, selectStudyAction } from "@/app/paired-testing-demo/studies/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StudyRouteMap, type RoutePointMode } from "@/components/paired-testing/studies/study-route-map";
import type { GeocodingResult } from "@/lib/geocoding/types";
import type { ProviderServiceOption, Study } from "@/lib/data/studies";

type DraftPoint = GeocodingResult & { label: string; isPublicLocation: boolean };
const stepLabels = ["Details", "Initial route", "Providers", "Review & schedule"];

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function CreateStudyForm({ providerOptions, onCreated }: { providerOptions: ProviderServiceOption[]; onCreated: () => void }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [studyType, setStudyType] = useState<"within_platform_pair" | "cross_platform_comparison">("within_platform_pair");
  const [studyQuestion, setStudyQuestion] = useState("");
  const [isolatedVariable, setIsolatedVariable] = useState("");
  const [targetPairCount, setTargetPairCount] = useState("");
  const [searchCountry, setSearchCountry] = useState<"PH" | "US">("PH");
  const [testingStartsAt, setTestingStartsAt] = useState("");
  const [testingEndsAt, setTestingEndsAt] = useState("");
  const [scheduleMinimumBase, setScheduleMinimumBase] = useState<number | null>(null);
  const [routeName, setRouteName] = useState("");
  const [pickupInstructions, setPickupInstructions] = useState("");
  const [destinationInstructions, setDestinationInstructions] = useState("");
  const [routeNotes, setRouteNotes] = useState("");
  const [activeMode, setActiveMode] = useState<RoutePointMode>("pickup");
  const [locationEntryMode, setLocationEntryMode] = useState<"search" | "coordinates">("search");
  const [pickup, setPickup] = useState<DraftPoint | null>(null);
  const [destination, setDestination] = useState<DraftPoint | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customLatitude, setCustomLatitude] = useState("");
  const [customLongitude, setCustomLongitude] = useState("");

  const marketProviders = useMemo(() => providerOptions.filter((option) => option.countryCode === (pickup?.countryCode ?? searchCountry)), [pickup, providerOptions, searchCountry]);
  const selectedProviderOptions = useMemo(() => providerOptions.filter((option) => selectedServices.includes(option.id)), [providerOptions, selectedServices]);
  const groupedProviders = useMemo(() => {
    const groups = new Map<string, { platformId: string; platformName: string; tiers: ProviderServiceOption[] }>();
    marketProviders.forEach((option) => {
      const group = groups.get(option.platformId) ?? { platformId: option.platformId, platformName: option.platformName, tiers: [] };
      group.tiers.push(option);
      groups.set(option.platformId, group);
    });
    return [...groups.values()];
  }, [marketProviders]);
  const selectedProviderGroups = useMemo(() => groupedProviders.filter((provider) => selectedPlatformIds.includes(provider.platformId)), [groupedProviders, selectedPlatformIds]);
  const selectedCrossCategory = studyType === "cross_platform_comparison" ? selectedProviderOptions[0]?.normalizedCategory : undefined;
  const awaitingReferenceTier = studyType === "cross_platform_comparison" && selectedPlatformIds.length === 1 && !selectedCrossCategory;
  const minimumTestingStart = scheduleMinimumBase === null
    ? undefined
    : formatInTimeZone(new Date(scheduleMinimumBase + 60_000), pickup?.timezone ?? "UTC", "yyyy-MM-dd'T'HH:mm");
  const minimumTestingEnd = testingStartsAt && pickup
    ? formatInTimeZone(new Date(fromZonedTime(testingStartsAt, pickup.timezone).getTime() + 60_000), pickup.timezone, "yyyy-MM-dd'T'HH:mm")
    : minimumTestingStart;

  function validateStep(index: number): boolean {
    const nextErrors: Record<string, string> = {};
    if (index === 0) {
      if (name.trim().length < 3) nextErrors.name = "Enter a study name.";
      if (studyQuestion.trim().length < 10) nextErrors.studyQuestion = "Enter a clear research question.";
      if (isolatedVariable.trim().length < 2) nextErrors.isolatedVariable = "Enter the isolated variable.";
      if (targetPairCount && (!Number.isInteger(Number(targetPairCount)) || Number(targetPairCount) <= 0)) nextErrors.targetPairCount = "Enter a positive whole number.";
    }
    if (index === 1) {
      if (!pickup) nextErrors.pickup = "Set the pickup pin.";
      else {
        if (pickup.label.trim().length < 2) nextErrors.pickup = "Enter a pickup label.";
        if (!pickup.isPublicLocation) nextErrors.pickupPublic = "Confirm that the pickup is public.";
      }
      if (!destination) nextErrors.destination = "Set the destination pin.";
      else {
        if (destination.label.trim().length < 2) nextErrors.destination = "Enter a destination label.";
        if (!destination.isPublicLocation) nextErrors.destinationPublic = "Confirm that the destination is public.";
      }
      if (pickup && destination && pickup.countryCode !== destination.countryCode) nextErrors.destination = "Pickup and destination must be in the same country.";
      if (pickup && destination && pickup.currencyCode !== destination.currencyCode) nextErrors.destination = "Pickup and destination must use the same currency.";
      if (pickup && destination && pickup.latitude === destination.latitude && pickup.longitude === destination.longitude) nextErrors.destination = "Pickup and destination must be different.";
      if (routeName.trim().length < 3) nextErrors.routeName = "Enter a route name.";
    }
    if (index === 2) {
      if (studyType === "within_platform_pair" && selectedPlatformIds.length !== 1) nextErrors.providers = "Select one provider.";
      if (studyType === "cross_platform_comparison" && selectedPlatformIds.length < 2) nextErrors.providers = "Select at least two providers.";
      const missingTierProvider = selectedProviderGroups.find((provider) => !provider.tiers.some((tier) => selectedServices.includes(tier.id)));
      if (missingTierProvider) nextErrors.tiers = `Select one ${missingTierProvider.platformName} ride tier.`;
      if (!selectedProviderOptions.length && !nextErrors.tiers) nextErrors.tiers = "Select at least one ride tier.";
      if (selectedServices.length !== selectedPlatformIds.length) nextErrors.tiers = "Select exactly one ride tier for each provider.";
      const categories = new Set(selectedProviderOptions.map((option) => option.normalizedCategory));
      const platforms = new Set(selectedProviderOptions.map((option) => option.platformId));
      if (studyType === "within_platform_pair" && platforms.size > 1) nextErrors.tiers = "Selected tiers must belong to one provider.";
      if (studyType === "cross_platform_comparison" && categories.size > 1) nextErrors.tiers = "Cross-platform services must use the same ride tier category.";
    }
    if (index === 3 && pickup) {
      const startsAt = testingStartsAt ? fromZonedTime(testingStartsAt, pickup.timezone) : null;
      const endsAt = testingEndsAt ? fromZonedTime(testingEndsAt, pickup.timezone) : null;
      if (startsAt && startsAt < new Date()) nextErrors.schedule = "Testing cannot start in the past.";
      else if (startsAt && endsAt && endsAt <= startsAt) nextErrors.schedule = "Testing must end after it starts.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goToStep(index: number) {
    if (index <= step) {
      setErrors({});
      // The schedule minimum must reflect when the user opens this step.
      // eslint-disable-next-line react-hooks/purity
      if (index === 3) setScheduleMinimumBase(Date.now());
      setStep(index);
      return;
    }
    for (let current = 0; current < index; current += 1) {
      if (!validateStep(current)) {
        setStep(current);
        return;
      }
    }
    // eslint-disable-next-line react-hooks/purity
    if (index === 3) setScheduleMinimumBase(Date.now());
    setStep(index);
  }

  async function search() {
    if (searchQuery.trim().length < 3) return;
    setSearching(true);
    try {
      const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(searchQuery)}&country=${searchCountry}`);
      const payload = await response.json() as { results?: GeocodingResult[]; message?: string };
      if (!response.ok) throw new Error(payload.message);
      setSearchResults(payload.results ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Location search failed.");
    } finally {
      setSearching(false);
    }
  }

  function assignPoint(result: GeocodingResult) {
    const current = activeMode === "pickup" ? pickup : destination;
    const point: DraftPoint = {
      ...result,
      label: current?.label || result.formattedAddress.split(",")[0],
      isPublicLocation: current?.isPublicLocation ?? false,
    };
    if (activeMode === "pickup") setPickup(point);
    else {
      setDestination(point);
      if (!routeName.trim() && pickup) setRouteName(`${pickup.label} to ${point.label}`);
    }
    setSearchResults([]);
    setSearchQuery("");
  }

  async function resolveCoordinates(mode: RoutePointMode, latitude: number, longitude: number) {
    setResolving(true);
    try {
      const response = await fetch(`/api/geocoding/reverse?lat=${latitude}&lng=${longitude}`);
      const payload = await response.json() as { result?: GeocodingResult; message?: string };
      if (!response.ok || !payload.result) throw new Error(payload.message);
      if (payload.result.countryCode !== searchCountry) throw new Error(`The coordinates must be inside ${searchCountry === "PH" ? "the Philippines" : "the United States"}.`);
      const current = mode === "pickup" ? pickup : destination;
      const point: DraftPoint = {
        ...payload.result,
        label: current?.label || payload.result.formattedAddress.split(",")[0],
        isPublicLocation: current?.isPublicLocation ?? false,
      };
      if (mode === "pickup") setPickup(point);
      else {
        setDestination(point);
        if (!routeName.trim() && pickup) setRouteName(`${pickup.label} to ${point.label}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Location lookup failed.");
    } finally {
      setResolving(false);
    }
  }

  function changeActiveMode(mode: RoutePointMode) {
    const point = mode === "pickup" ? pickup : destination;
    setActiveMode(mode);
    setCustomLatitude(point ? String(point.latitude) : "");
    setCustomLongitude(point ? String(point.longitude) : "");
    setSearchResults([]);
    setErrors({});
  }

  function applyCustomCoordinates() {
    if (!customLatitude.trim() || !customLongitude.trim()) {
      setErrors({ coordinates: "Enter both latitude and longitude." });
      return;
    }
    const latitude = Number(customLatitude);
    const longitude = Number(customLongitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setErrors({ coordinates: "Latitude must be between -90 and 90." });
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setErrors({ coordinates: "Longitude must be between -180 and 180." });
      return;
    }
    setErrors({});
    void resolveCoordinates(activeMode, latitude, longitude);
  }

  function changeStudyType(value: typeof studyType) {
    setStudyType(value);
    setSelectedPlatformIds([]);
    setSelectedServices([]);
    setErrors({});
  }

  function selectService(option: ProviderServiceOption) {
    if (selectedCrossCategory && option.normalizedCategory !== selectedCrossCategory) return;
    if (studyType === "cross_platform_comparison") {
      const compatiblePlatformIds = new Set(groupedProviders.filter((provider) => provider.tiers.some((tier) => tier.normalizedCategory === option.normalizedCategory)).map((provider) => provider.platformId));
      setSelectedPlatformIds((current) => current.filter((platformId) => compatiblePlatformIds.has(platformId)));
    }
    setSelectedServices((current) => {
      const providerTierIds = new Set(providerOptions.filter((item) => item.platformId === option.platformId).map((item) => item.id));
      const compatibleCurrent = studyType === "cross_platform_comparison"
        ? current.filter((id) => providerOptions.find((item) => item.id === id)?.normalizedCategory === option.normalizedCategory)
        : current;
      return [...compatibleCurrent.filter((id) => !providerTierIds.has(id)), option.id];
    });
    setErrors({});
  }

  function selectWithinProvider(platformId: string) {
    setSelectedPlatformIds([platformId]);
    setSelectedServices([]);
    setErrors({});
  }

  function clearTierSelections() {
    setSelectedServices([]);
    if (studyType === "cross_platform_comparison") setSelectedPlatformIds((current) => current.slice(0, 1));
    setErrors({});
  }

  function toggleCrossProvider(platformId: string, checked: boolean) {
    const provider = groupedProviders.find((group) => group.platformId === platformId);
    if (checked && awaitingReferenceTier) return;
    if (checked && selectedCrossCategory && !provider?.tiers.some((tier) => tier.normalizedCategory === selectedCrossCategory)) return;
    setSelectedPlatformIds((current) => checked ? [...current, platformId] : current.filter((id) => id !== platformId));
    if (!checked) {
      const tierIds = new Set(providerOptions.filter((option) => option.platformId === platformId).map((option) => option.id));
      setSelectedServices((current) => current.filter((id) => !tierIds.has(id)));
    }
    setErrors({});
  }

  function changeCountry(value: "PH" | "US") {
    setSearchCountry(value);
    setPickup(null);
    setDestination(null);
    setSelectedPlatformIds([]);
    setSelectedServices([]);
    setSearchResults([]);
    setSearchQuery("");
    setCustomLatitude("");
    setCustomLongitude("");
    setErrors({});
  }

  function submit() {
    for (let current = 0; current < 4; current += 1) {
      if (!validateStep(current)) {
        setStep(current);
        return;
      }
    }
    if (!pickup || !destination) return;
    startTransition(async () => {
      const result = await createStudyAction({
        name, description, studyType, studyQuestion, isolatedVariable,
        targetPairCount: targetPairCount ? Number(targetPairCount) : null,
        defaultCurrency: pickup.currencyCode,
        displayTimezone: pickup.timezone,
        testingStartsAt: testingStartsAt ? fromZonedTime(testingStartsAt, pickup.timezone).toISOString() : null,
        testingEndsAt: testingEndsAt ? fromZonedTime(testingEndsAt, pickup.timezone).toISOString() : null,
        searchCountryCode: searchCountry, routeName, pickup, destination,
        pickupInstructions, destinationInstructions, routeNotes,
        platformServiceIds: selectedServices,
      });
      if (result.ok) {
        toast.success(result.message);
        onCreated();
      } else toast.error(result.message);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2 border-b border-border pb-4 sm:grid-cols-4">
        {stepLabels.map((label, index) => (
          <button key={label} type="button" onClick={() => goToStep(index)} className={`h-9 border-b-2 text-xs font-medium ${step === index ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {index + 1}. {label}
          </button>
        ))}
      </div>

      {step === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="study-name">Study name</Label>
            <Input id="study-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} />
            <FieldError message={errors.name} />
            <p className="text-xs text-muted-foreground">The study code will be assigned automatically after the route country is validated.</p>
          </div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="study-description">Description</Label><Textarea id="study-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="study-type">Study mode</Label><Select value={studyType} onValueChange={(value) => changeStudyType(value as typeof studyType)}><SelectTrigger id="study-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="within_platform_pair">Within-platform paired testing</SelectItem><SelectItem value="cross_platform_comparison">Cross-platform comparison</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="target-pairs">Target pair count</Label><Input id="target-pairs" type="number" min="1" value={targetPairCount} onChange={(event) => setTargetPairCount(event.target.value)} aria-invalid={Boolean(errors.targetPairCount)} /><FieldError message={errors.targetPairCount} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="study-question">Research question</Label><Textarea id="study-question" value={studyQuestion} onChange={(event) => setStudyQuestion(event.target.value)} aria-invalid={Boolean(errors.studyQuestion)} /><FieldError message={errors.studyQuestion} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="isolated-variable">Isolated variable</Label><Input id="isolated-variable" value={isolatedVariable} onChange={(event) => setIsolatedVariable(event.target.value)} aria-invalid={Boolean(errors.isolatedVariable)} /><FieldError message={errors.isolatedVariable} /></div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div className="w-full max-w-xs space-y-2"><Label htmlFor="search-country">Search country</Label><Select value={searchCountry} onValueChange={(value) => changeCountry(value as "PH" | "US")}><SelectTrigger id="search-country" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PH">Philippines</SelectItem><SelectItem value="US">United States</SelectItem></SelectContent></Select></div>
            <div className="flex items-center gap-2"><Badge variant={pickup ? "secondary" : "outline"}>{pickup ? <Check className="size-3" /> : null}Pickup</Badge><Badge variant={destination ? "secondary" : "outline"}>{destination ? <Check className="size-3" /> : null}Destination</Badge></div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="space-y-2"><Label>Location to set</Label><div className="grid grid-cols-2 rounded-md border border-border p-1">{(["pickup", "destination"] as const).map((mode) => <button key={mode} type="button" onClick={() => changeActiveMode(mode)} className={`h-9 text-xs font-medium capitalize ${activeMode === mode ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{mode === "pickup" ? <MapPin className="mr-1 inline size-3.5 text-primary" /> : <MapPin className="mr-1 inline size-3.5 text-amber-500" />}{mode}</button>)}</div></div>
            <div className="space-y-2"><Label>Location entry</Label><div className="flex h-11 w-fit items-center gap-1 rounded-md border border-border p-1"><Button type="button" size="sm" variant={locationEntryMode === "search" ? "secondary" : "ghost"} onClick={() => setLocationEntryMode("search")}><Search className="size-4" />Search</Button><Button type="button" size="sm" variant={locationEntryMode === "coordinates" ? "secondary" : "ghost"} onClick={() => setLocationEntryMode("coordinates")}><LocateFixed className="size-4" />Coordinates</Button></div></div>
          </div>

          {locationEntryMode === "search" ? <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><Input aria-label={`Search ${activeMode} location`} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} placeholder={`Search ${activeMode} in ${searchCountry === "PH" ? "the Philippines" : "the United States"}`} /><Button type="button" variant="outline" onClick={() => void search()} disabled={searching || searchQuery.trim().length < 3}>{searching ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}Search</Button></div> : null}

          {locationEntryMode === "coordinates" ? <div className="grid gap-3 border-y border-border py-4 sm:grid-cols-[1fr_1fr_auto]"><div className="space-y-2"><Label htmlFor="custom-latitude">Latitude</Label><Input id="custom-latitude" inputMode="decimal" value={customLatitude} onChange={(event) => setCustomLatitude(event.target.value)} placeholder="14.5995" /></div><div className="space-y-2"><Label htmlFor="custom-longitude">Longitude</Label><Input id="custom-longitude" inputMode="decimal" value={customLongitude} onChange={(event) => setCustomLongitude(event.target.value)} placeholder="120.9842" /></div><Button type="button" variant="outline" className="self-end" onClick={applyCustomCoordinates} disabled={resolving}><LocateFixed className="size-4" />Set {activeMode}</Button><div className="sm:col-span-3"><FieldError message={errors.coordinates} /></div></div> : null}

          {searchResults.length ? <div className="divide-y divide-border rounded-md border border-border">{searchResults.map((result) => <button type="button" key={`${result.externalPlaceId}-${result.latitude}`} onClick={() => assignPoint(result)} className="flex w-full items-start gap-3 p-3 text-left text-xs hover:bg-secondary"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span>{result.formattedAddress}</span></button>)}</div> : null}
          <div className="relative"><StudyRouteMap countryCode={searchCountry} activeMode={activeMode} pickup={pickup} destination={destination} onCoordinatesChange={(mode, lat, lng) => void resolveCoordinates(mode, lat, lng)} /><span className="absolute left-3 top-3 rounded-md border border-border bg-background/90 px-2 py-1 text-xs font-medium capitalize shadow-sm">Setting {activeMode}</span>{resolving ? <span className="absolute bottom-3 left-3 rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground">Resolving location...</span> : null}</div>
          <div className="grid gap-5 md:grid-cols-2">
            {(["pickup", "destination"] as const).map((mode) => {
              const point = mode === "pickup" ? pickup : destination;
              const setPoint = mode === "pickup" ? setPickup : setDestination;
              return <section key={mode} className={`space-y-3 rounded-md border p-4 ${activeMode === mode ? "border-primary" : "border-border"}`}><button type="button" onClick={() => changeActiveMode(mode)} className="flex w-full items-center justify-between text-left"><span className="text-sm font-semibold capitalize">{mode}</span>{point ? <Badge variant="secondary"><Check className="size-3" />Pinned</Badge> : <Badge variant="outline">Not set</Badge>}</button><div className="space-y-2"><Label htmlFor={`${mode}-label`}>Location label</Label><Input id={`${mode}-label`} value={point?.label ?? ""} disabled={!point} onChange={(event) => point && setPoint({ ...point, label: event.target.value })} placeholder={`${mode} label`} aria-invalid={Boolean(errors[mode])} /></div><p className="min-h-10 text-xs leading-5 text-muted-foreground">{point?.formattedAddress ?? "No location selected."}</p>{point ? <><div className="grid grid-cols-2 gap-2 border-y border-border py-3 text-xs"><div><span className="block text-muted-foreground">Coordinates</span><span className="mono mt-1 block text-[10px]">{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</span></div><div><span className="block text-muted-foreground">Market</span><span className="mt-1 block">{point.currencyCode} · {point.timezone}</span></div></div><label className="flex items-start gap-2 text-xs text-muted-foreground"><Checkbox checked={point.isPublicLocation} onCheckedChange={(checked) => setPoint({ ...point, isPublicLocation: checked === true })} />Standardized public location</label></> : null}<FieldError message={errors[mode]} /><FieldError message={errors[`${mode}Public`]} /></section>;
            })}
          </div>
          <div className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="route-name">Route name</Label><Input id="route-name" value={routeName} onChange={(event) => setRouteName(event.target.value)} aria-invalid={Boolean(errors.routeName)} /><FieldError message={errors.routeName} /></div><div className="space-y-2"><Label htmlFor="route-notes">Route notes</Label><Input id="route-notes" value={routeNotes} onChange={(event) => setRouteNotes(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="pickup-instructions">Pickup instructions</Label><Textarea id="pickup-instructions" value={pickupInstructions} onChange={(event) => setPickupInstructions(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="destination-instructions">Destination instructions</Label><Textarea id="destination-instructions" value={destinationInstructions} onChange={(event) => setDestinationInstructions(event.target.value)} /></div></div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          {pickup ? <Alert><AlertDescription>{studyType === "within_platform_pair" ? "Select one provider and one exact ride tier." : "Select a reference provider and its ride tier first. The system will then enable only providers with a comparable tier."} Availability is based on the {pickup.countryCode} pickup market.</AlertDescription></Alert> : null}

          <section className="space-y-3">
            <div><h3 className="text-sm font-semibold">1. Select {studyType === "within_platform_pair" ? "a provider" : "providers"}</h3><p className="mt-1 text-xs text-muted-foreground">Ride tiers become available after provider selection.</p></div>
            <div className="divide-y divide-border rounded-md border border-border">
              {groupedProviders.map((provider) => {
                const selected = selectedPlatformIds.includes(provider.platformId);
                const lacksComparableTier = Boolean(studyType === "cross_platform_comparison" && selectedCrossCategory && !provider.tiers.some((tier) => tier.normalizedCategory === selectedCrossCategory));
                const waitingForTier = awaitingReferenceTier && !selected;
                const providerDisabled = lacksComparableTier || waitingForTier;
                const categoryLabel = selectedCrossCategory?.replaceAll("_", " ");
                return <label key={provider.platformId} className={`flex min-h-14 items-center gap-3 px-4 py-3 ${providerDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-secondary"}`}>{studyType === "within_platform_pair" ? <input type="radio" name="study-provider" checked={selected} onChange={() => selectWithinProvider(provider.platformId)} className="size-4 accent-primary" /> : <Checkbox disabled={providerDisabled} checked={selected} onCheckedChange={(checked) => toggleCrossProvider(provider.platformId, checked === true)} />}<span className="min-w-0 flex-1"><span className="block text-sm font-medium">{provider.platformName}</span><span className="block text-xs capitalize text-muted-foreground">{waitingForTier ? "Select the reference tier first" : lacksComparableTier ? `No ${categoryLabel} tier` : selectedCrossCategory ? `${categoryLabel} tier available` : `${provider.tiers.length} available ride ${provider.tiers.length === 1 ? "tier" : "tiers"}`}</span></span>{selected ? <Check className="size-4 text-primary" /> : null}</label>;
              })}
            </div>
            <FieldError message={errors.providers} />
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">2. Select ride tier</h3><p className="mt-1 text-xs text-muted-foreground">Choose exactly one tier for every selected provider.{studyType === "cross_platform_comparison" ? " The reference tier controls which other providers and tiers are comparable." : " Both tester sides will use this exact tier."}</p></div>{selectedServices.length ? <Button type="button" size="sm" variant="ghost" onClick={clearTierSelections}>Clear tiers</Button> : null}</div>
            {selectedProviderGroups.length ? <div className="space-y-5">{selectedProviderGroups.map((provider) => {
              const selectedTierCount = provider.tiers.filter((tier) => selectedServices.includes(tier.id)).length;
              return <div key={provider.platformId}><div className="mb-2 flex items-center justify-between"><h4 className="text-xs font-semibold uppercase text-muted-foreground">{provider.platformName}</h4><span className="text-xs text-muted-foreground">{selectedTierCount} selected</span></div><div className="grid gap-2 sm:grid-cols-2">{provider.tiers.map((tier) => {
                const incompatible = Boolean(selectedCrossCategory && tier.normalizedCategory !== selectedCrossCategory);
                return <label key={tier.id} className={`flex min-h-16 items-center gap-3 rounded-md border p-3 ${incompatible ? "cursor-not-allowed border-border opacity-50" : selectedServices.includes(tier.id) ? "cursor-pointer border-primary bg-primary/5" : "cursor-pointer border-border hover:bg-secondary"}`}><input type="radio" name={`ride-tier-${provider.platformId}`} disabled={incompatible} checked={selectedServices.includes(tier.id)} onChange={() => selectService(tier)} className="size-4 accent-primary" /><span className="min-w-0"><span className="block text-sm font-medium">{tier.serviceName}</span><span className="block text-xs capitalize text-muted-foreground">{tier.normalizedCategory.replaceAll("_", " ")}{incompatible ? " · Not comparable" : ""}</span></span></label>;
              })}</div></div>;
            })}</div> : <div className="border-y border-border py-8 text-center text-sm text-muted-foreground">Select {studyType === "within_platform_pair" ? "a provider" : "providers"} above to view ride tiers.</div>}
            <FieldError message={errors.tiers} />
            {!marketProviders.length ? <p className="text-sm text-muted-foreground">No provider services are configured for this pinned market yet.</p> : null}
          </section>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6">
          <div className="grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Study</p><p className="mt-1 text-sm font-medium">{name}</p><p className="mt-1 text-xs text-muted-foreground">Code assigned automatically</p></div>
            <div><p className="text-xs text-muted-foreground">Route</p><p className="mt-1 text-sm font-medium">{routeName}</p><p className="mt-1 text-xs text-muted-foreground">{pickup?.countryCode} · {pickup?.currencyCode}</p></div>
            <div><p className="text-xs text-muted-foreground">Timezone</p><p className="mt-1 text-sm font-medium">{pickup?.timezone ?? "Pending route"}</p><p className="mt-1 text-xs text-muted-foreground">Derived from pickup pin</p></div>
            <div><p className="text-xs text-muted-foreground">Providers</p><p className="mt-1 text-sm font-medium">{new Set(selectedProviderOptions.map((option) => option.platformId)).size}</p><p className="mt-1 text-xs text-muted-foreground">{selectedProviderOptions.length} selected services</p></div>
          </div>
          <div className="space-y-3"><h3 className="text-sm font-semibold">Provider and ride tiers</h3><div className="divide-y divide-border border-y border-border">{selectedProviderGroups.map((provider) => <div key={provider.platformId} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]"><p className="text-sm font-medium">{provider.platformName}</p><p className="text-xs leading-5 text-muted-foreground">{provider.tiers.filter((tier) => selectedServices.includes(tier.id)).map((tier) => tier.serviceName).join(", ")}</p></div>)}</div></div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="testing-start">Testing starts</Label><Input id="testing-start" type="datetime-local" min={minimumTestingStart} value={testingStartsAt} onChange={(event) => { setTestingStartsAt(event.target.value); if (testingEndsAt && event.target.value >= testingEndsAt) setTestingEndsAt(""); setErrors({}); }} aria-invalid={Boolean(errors.schedule)} /></div>
            <div className="space-y-2"><Label htmlFor="testing-end">Testing ends</Label><Input id="testing-end" type="datetime-local" min={minimumTestingEnd} value={testingEndsAt} onChange={(event) => { setTestingEndsAt(event.target.value); setErrors({}); }} aria-invalid={Boolean(errors.schedule)} /></div>
          </div>
          <FieldError message={errors.schedule} />
          <div className="grid gap-3 sm:grid-cols-2"><div className="border-l-2 border-primary pl-3"><p className="text-xs font-medium">Pickup</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{pickup?.label}<br />{pickup?.formattedAddress}</p></div><div className="border-l-2 border-amber-400 pl-3"><p className="text-xs font-medium">Destination</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{destination?.label}<br />{destination?.formattedAddress}</p></div></div>
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => goToStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft className="size-4" />Back</Button>
        {step < 3 ? <Button type="button" onClick={() => goToStep(step + 1)}>Continue<ChevronRight className="size-4" /></Button> : <Button type="button" onClick={submit} disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Creating..." : "Create study"}</Button>}
      </div>
    </div>
  );
}

function StudyList({ studies, activeStudyId }: { studies: Study[]; activeStudyId: string | null }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  function select(study: Study) {
    setPendingId(study.id);
    void selectStudyAction(study.id).then((result) => {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      setPendingId(null);
    });
  }
  return <div className="overflow-hidden rounded-md border border-border"><Table><TableHeader className="bg-secondary/45"><TableRow><TableHead>Study</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead><TableHead>Currency</TableHead><TableHead>Updated</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{studies.map((study) => <TableRow key={study.id}><TableCell className="min-w-64 whitespace-normal"><p className="font-medium">{study.name}</p><p className="mono mt-1 text-[10px] text-muted-foreground">{study.study_code}</p></TableCell><TableCell className="text-xs">{study.study_type === "within_platform_pair" ? "Within platform" : "Cross platform"}</TableCell><TableCell><Badge variant={study.status === "active" ? "default" : "outline"} className="capitalize">{study.status}</Badge></TableCell><TableCell>{study.default_currency ?? "-"}</TableCell><TableCell className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(study.updated_at))}</TableCell><TableCell><div className="flex justify-end gap-2"><Button asChild size="sm" variant="outline"><Link href={`/paired-testing-demo/studies/${study.id}/members`}><Users className="size-3.5" />Members</Link></Button><Button size="sm" variant={study.id === activeStudyId ? "secondary" : "outline"} disabled={study.id === activeStudyId || pendingId === study.id} onClick={() => select(study)}>{pendingId === study.id ? <LoaderCircle className="size-4 animate-spin" /> : study.id === activeStudyId ? <Check className="size-4" /> : null}{study.id === activeStudyId ? "Selected" : "Select"}</Button></div></TableCell></TableRow>)}{!studies.length ? <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No studies are available yet.</TableCell></TableRow> : null}</TableBody></Table></div>;
}

export function StudiesManager({ studies, activeStudyId, providerOptions }: { studies: Study[]; activeStudyId: string | null; providerOptions: ProviderServiceOption[] }) {
  const [tab, setTab] = useState("studies");
  return <Tabs value={tab} onValueChange={setTab}><div className="flex items-center justify-between gap-3"><TabsList><TabsTrigger value="studies">All studies</TabsTrigger><TabsTrigger value="create">Create study</TabsTrigger></TabsList><Button onClick={() => setTab("create")}><Plus className="size-4" />Create study</Button></div><TabsContent value="studies" className="mt-5"><StudyList studies={studies} activeStudyId={activeStudyId} /></TabsContent><TabsContent value="create" className="mt-5"><CreateStudyForm providerOptions={providerOptions} onCreated={() => setTab("studies")} /></TabsContent></Tabs>;
}
