"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Archive, CalendarClock, Check, ChevronLeft, ChevronRight, CircleCheck, LocateFixed, LoaderCircle, MapPin, Pause, Pencil, Play, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { createStudyAction, deleteDraftStudyAction, extendStudyTestingPeriodAction, selectStudyAction, transitionStudyStatusAction, updateFullDraftStudyAction } from "@/app/paired-testing-demo/studies/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StudyRouteMap, type RoutePointMode } from "@/components/paired-testing/studies/study-route-map";
import { configuredStudyServices } from "@/components/paired-testing/shared/study-service-context";
import type { GeocodingResult } from "@/lib/geocoding/types";
import type { ProviderServiceOption, Study, StudyCompletionReadiness, StudyEditorInitialData } from "@/lib/data/studies";
import type { AppRole } from "@/lib/data/profiles";

type DraftPoint = GeocodingResult & { label: string; isPublicLocation: boolean };
const stepLabels = ["Study design", "Initial route", "Test conditions", "Schedule & review"];
const stepDescriptions = [
  "Define the question and target",
  "Set pickup and destination",
  "Lock service and device controls",
  "Set dates and confirm",
];

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function CreateStudyForm({ providerOptions, initialData }: { providerOptions: ProviderServiceOption[]; initialData?: StudyEditorInitialData }) {
  const router = useRouter();
  const initialConfiguration = initialData?.study.configuration && typeof initialData.study.configuration === "object" && !Array.isArray(initialData.study.configuration) ? initialData.study.configuration as Record<string, unknown> : {};
  const initialServiceA = typeof initialConfiguration.tester_a_service_id === "string" ? initialConfiguration.tester_a_service_id : "";
  const initialServiceB = typeof initialConfiguration.tester_b_service_id === "string" ? initialConfiguration.tester_b_service_id : initialServiceA;
  const initialDeviceDesign = initialConfiguration.device_comparison_design === "same_operating_system" || initialConfiguration.device_comparison_design === "different_operating_system" ? initialConfiguration.device_comparison_design : "same_operating_system";
  const toDraftPoint = (location: StudyEditorInitialData["pickup"]): DraftPoint => ({ label: location.label, formattedAddress: location.formatted_address, latitude: location.latitude, longitude: location.longitude, countryCode: location.country_code, regionName: location.region_name, currencyCode: location.currency_code, timezone: location.timezone, geocodingProvider: "nominatim", externalPlaceId: location.external_place_id, isPublicLocation: location.is_public_location });
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [name, setName] = useState(initialData?.study.name ?? "");
  const [studyType, setStudyType] = useState<"within_platform_pair" | "cross_platform_comparison">(initialData?.study.study_type ?? "within_platform_pair");
  const [withinComparisonDesign, setWithinComparisonDesign] = useState<"same_tier" | "different_tier">(initialServiceA && initialServiceB && initialServiceA !== initialServiceB ? "different_tier" : "same_tier");
  const [studyQuestion, setStudyQuestion] = useState(initialData?.study.study_question ?? "");
  const [isolatedVariable, setIsolatedVariable] = useState(initialData?.study.isolated_variable ?? "");
  const [targetPairCount, setTargetPairCount] = useState(String(initialData?.study.target_pair_count ?? ""));
  const [searchCountry, setSearchCountry] = useState<"PH" | "US" | "CA">((initialData?.pickup.country_code as "PH" | "US" | "CA" | undefined) ?? "PH");
  const [testingStartsAt, setTestingStartsAt] = useState(initialData?.study.testing_starts_at ? formatInTimeZone(new Date(initialData.study.testing_starts_at), initialData.study.display_timezone, "yyyy-MM-dd'T'HH:mm") : "");
  const [testingEndsAt, setTestingEndsAt] = useState(initialData?.study.testing_ends_at ? formatInTimeZone(new Date(initialData.study.testing_ends_at), initialData.study.display_timezone, "yyyy-MM-dd'T'HH:mm") : "");
  const [scheduleMinimumBase, setScheduleMinimumBase] = useState<number | null>(null);
  const [routeName, setRouteName] = useState(initialData?.route.route_name ?? "");
  const [pickupInstructions, setPickupInstructions] = useState(initialData?.route.pickup_instructions ?? "");
  const [destinationInstructions, setDestinationInstructions] = useState(initialData?.route.destination_instructions ?? "");
  const [routeNotes, setRouteNotes] = useState(initialData?.route.notes ?? "");
  const [activeMode, setActiveMode] = useState<RoutePointMode>("pickup");
  const [locationEntryMode, setLocationEntryMode] = useState<"search" | "coordinates">("search");
  const [pickup, setPickup] = useState<DraftPoint | null>(initialData ? toDraftPoint(initialData.pickup) : null);
  const [destination, setDestination] = useState<DraftPoint | null>(initialData ? toDraftPoint(initialData.destination) : null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>(() => [...new Set([initialServiceA, initialServiceB].filter(Boolean).map((id) => providerOptions.find((option) => option.id === id)?.platformId).filter((id): id is string => Boolean(id)))]);
  const [testerAServiceId, setTesterAServiceId] = useState(initialServiceA);
  const [testerBServiceId, setTesterBServiceId] = useState(initialServiceB);
  const [deviceRestrictionEnabled, setDeviceRestrictionEnabled] = useState(initialConfiguration.device_comparison_design === "same_operating_system" || initialConfiguration.device_comparison_design === "different_operating_system");
  const [deviceComparisonDesign, setDeviceComparisonDesign] = useState<"same_operating_system" | "different_operating_system">(initialDeviceDesign);
  const [testerAOperatingSystem, setTesterAOperatingSystem] = useState<"iOS" | "Android">(initialConfiguration.tester_a_operating_system === "Android" ? "Android" : "iOS");
  const [testerBOperatingSystem, setTesterBOperatingSystem] = useState<"iOS" | "Android">(initialConfiguration.tester_b_operating_system === "Android" ? "Android" : "iOS");
  const [testingSynchronization, setTestingSynchronization] = useState<"synchronized" | "asynchronous">(initialConfiguration.testing_synchronization === "asynchronous" ? "asynchronous" : "synchronized");
  const [customLatitude, setCustomLatitude] = useState("");
  const [customLongitude, setCustomLongitude] = useState("");

  const marketProviders = useMemo(() => providerOptions.filter((option) => option.countryCode === (pickup?.countryCode ?? searchCountry)), [pickup, providerOptions, searchCountry]);
  const selectedServices = useMemo(() => [...new Set([testerAServiceId, testerBServiceId].filter(Boolean))], [testerAServiceId, testerBServiceId]);
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
  const selectedWithinProvider = studyType === "within_platform_pair" ? selectedProviderGroups[0] : undefined;
  const selectedWithinProviderHasMultipleTiers = (selectedWithinProvider?.tiers.length ?? 0) >= 2;
  const selectedCrossCategory = studyType === "cross_platform_comparison" ? providerOptions.find((option) => option.id === testerAServiceId)?.normalizedCategory : undefined;
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
      if (!targetPairCount.trim()) nextErrors.targetPairCount = "Enter the required number of usable pairs.";
      else if (!Number.isInteger(Number(targetPairCount)) || Number(targetPairCount) <= 0) nextErrors.targetPairCount = "Enter a positive whole number.";
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
      if (studyType === "cross_platform_comparison" && selectedPlatformIds.length !== 2) nextErrors.providers = "Select exactly two providers.";
      if (!testerAServiceId) nextErrors.testerAServiceId = "Select Tester A's ride tier.";
      if (!testerBServiceId) nextErrors.testerBServiceId = "Select Tester B's ride tier.";
      const categories = new Set(selectedProviderOptions.map((option) => option.normalizedCategory));
      const platforms = new Set(selectedProviderOptions.map((option) => option.platformId));
      if (studyType === "within_platform_pair" && platforms.size > 1) nextErrors.tiers = "Selected tiers must belong to one provider.";
      if (studyType === "within_platform_pair" && withinComparisonDesign === "same_tier" && testerAServiceId && testerBServiceId && testerAServiceId !== testerBServiceId) nextErrors.tiers = "Same-tier comparisons require the same ride tier on both sides.";
      if (studyType === "within_platform_pair" && withinComparisonDesign === "different_tier" && testerAServiceId && testerBServiceId && testerAServiceId === testerBServiceId) nextErrors.tiers = "Different-tier comparisons require two different ride tiers.";
      if (studyType === "cross_platform_comparison" && categories.size > 1) nextErrors.tiers = "Cross-platform services must use the same ride tier category.";
      if (studyType === "cross_platform_comparison" && platforms.size !== 2 && testerAServiceId && testerBServiceId) nextErrors.tiers = "Tester A and Tester B must use different providers.";
      if (deviceRestrictionEnabled && deviceComparisonDesign === "same_operating_system" && testerAOperatingSystem !== testerBOperatingSystem) nextErrors.operatingSystems = "Select the same operating system for both tester sides.";
      if (deviceRestrictionEnabled && deviceComparisonDesign === "different_operating_system" && testerAOperatingSystem === testerBOperatingSystem) nextErrors.operatingSystems = "Select different operating systems for Tester A and Tester B.";
    }
    if (index === 3 && pickup) {
      const startsAt = testingStartsAt ? fromZonedTime(testingStartsAt, pickup.timezone) : null;
      const endsAt = testingEndsAt ? fromZonedTime(testingEndsAt, pickup.timezone) : null;
      if (!startsAt) nextErrors.testingStartsAt = "Select when testing starts.";
      if (!endsAt) nextErrors.testingEndsAt = "Select when testing ends.";
      if (startsAt && startsAt < new Date()) nextErrors.testingStartsAt = "Testing cannot start in the past.";
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
    if (activeMode === "pickup") {
      setPickup(point);
      advanceToDestination();
    }
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
      if (payload.result.countryCode !== searchCountry) throw new Error(`The coordinates must be inside ${{ PH: "the Philippines", US: "the United States", CA: "Canada" }[searchCountry]}.`);
      const current = mode === "pickup" ? pickup : destination;
      const point: DraftPoint = {
        ...payload.result,
        label: current?.label || payload.result.formattedAddress.split(",")[0],
        isPublicLocation: current?.isPublicLocation ?? false,
      };
      if (mode === "pickup") {
        setPickup(point);
        advanceToDestination();
      }
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

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("Current location is not available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      setCustomLatitude(String(latitude));
      setCustomLongitude(String(longitude));
      setLocationEntryMode("coordinates");
      setLocating(false);
      void resolveCoordinates(activeMode, latitude, longitude);
    }, (error) => {
      setLocating(false);
      toast.error(error.code === error.PERMISSION_DENIED ? "Location access was denied. Enter coordinates or search for a location instead." : "The current location could not be read.");
    }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 });
  }

  function changeStudyType(value: typeof studyType) {
    setStudyType(value);
    setIsolatedVariable((current) => value === "cross_platform_comparison" ? "Ride-hailing platform" : current === "Ride-hailing platform" ? "" : current);
    setSelectedPlatformIds([]);
    setTesterAServiceId("");
    setTesterBServiceId("");
    setErrors({});
  }

  function advanceToDestination() {
    if (destination) return;
    setActiveMode("destination");
    setCustomLatitude("");
    setCustomLongitude("");
    setSearchQuery("");
    setSearchResults([]);
  }

  function selectSideService(side: "tester_a" | "tester_b", option: ProviderServiceOption) {
    if (studyType === "cross_platform_comparison" && side === "tester_b" && selectedCrossCategory && option.normalizedCategory !== selectedCrossCategory) return;
    if (studyType === "within_platform_pair" && withinComparisonDesign === "same_tier") {
      setTesterAServiceId(option.id);
      setTesterBServiceId(option.id);
      setErrors({});
      return;
    }
    if (side === "tester_a") {
      setTesterAServiceId(option.id);
      if (studyType === "cross_platform_comparison") setTesterBServiceId("");
    } else {
      setTesterBServiceId(option.id);
    }
    setErrors({});
  }

  function selectWithinProvider(platformId: string) {
    const provider = groupedProviders.find((group) => group.platformId === platformId);
    setSelectedPlatformIds([platformId]);
    setTesterAServiceId("");
    setTesterBServiceId("");
    if ((provider?.tiers.length ?? 0) < 2) {
      setWithinComparisonDesign("same_tier");
    }
    setErrors({});
  }

  function changeWithinComparisonDesign(value: "same_tier" | "different_tier") {
    setWithinComparisonDesign(value);
    setTesterAServiceId("");
    setTesterBServiceId("");
    setErrors({});
  }

  function clearTierSelections() {
    setTesterAServiceId("");
    setTesterBServiceId("");
    if (studyType === "cross_platform_comparison") setSelectedPlatformIds((current) => current.slice(0, 1));
    setErrors({});
  }

  function toggleCrossProvider(platformId: string, checked: boolean) {
    const provider = groupedProviders.find((group) => group.platformId === platformId);
    if (checked && awaitingReferenceTier) return;
    if (checked && selectedCrossCategory && !provider?.tiers.some((tier) => tier.normalizedCategory === selectedCrossCategory)) return;
    setSelectedPlatformIds((current) => checked ? [...current.filter((id) => id !== platformId), platformId].slice(0, 2) : current.filter((id) => id !== platformId));
    if (!checked) {
      if (providerOptions.find((option) => option.id === testerAServiceId)?.platformId === platformId) setTesterAServiceId("");
      if (providerOptions.find((option) => option.id === testerBServiceId)?.platformId === platformId) setTesterBServiceId("");
    }
    setErrors({});
  }

  function changeCountry(value: "PH" | "US" | "CA") {
    setSearchCountry(value);
    setPickup(null);
    setDestination(null);
    setSelectedPlatformIds([]);
    setTesterAServiceId("");
    setTesterBServiceId("");
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
      const payload = {
        name, studyType, studyQuestion, isolatedVariable,
        targetPairCount: targetPairCount ? Number(targetPairCount) : null,
        defaultCurrency: pickup.currencyCode,
        displayTimezone: pickup.timezone,
        testingStartsAt: testingStartsAt ? fromZonedTime(testingStartsAt, pickup.timezone).toISOString() : null,
        testingEndsAt: testingEndsAt ? fromZonedTime(testingEndsAt, pickup.timezone).toISOString() : null,
        searchCountryCode: searchCountry, routeName, pickup, destination,
        pickupInstructions, destinationInstructions, routeNotes,
        platformServiceIds: [testerAServiceId, testerBServiceId],
        testerAServiceId,
        testerBServiceId,
        deviceComparisonDesign: deviceRestrictionEnabled ? deviceComparisonDesign : "uncontrolled",
        ...(deviceRestrictionEnabled ? { testerAOperatingSystem, testerBOperatingSystem } : {}),
        testingSynchronization,
      };
      const result = initialData ? await updateFullDraftStudyAction(initialData.study.id, payload) : await createStudyAction(payload);
      if (result.ok) {
        toast.success(result.message);
        if (initialData) {
          router.push("/paired-testing-demo/studies");
          router.refresh();
        } else if (result.studyId) {
          router.push(`/paired-testing-demo/studies/${result.studyId}/members`);
          router.refresh();
        }
      } else toast.error(result.message);
    });
  }

  return (
    <div className="space-y-7">
      <div className="overflow-hidden rounded-md border border-border bg-secondary/10">
        <div className="grid grid-cols-2 sm:grid-cols-4">
        {stepLabels.map((label, index) => (
          <button key={label} type="button" onClick={() => goToStep(index)} className={`min-h-20 border-b-2 px-3 py-3 text-left transition-colors sm:min-h-24 ${step === index ? "border-primary bg-primary/[0.06]" : "border-transparent hover:bg-secondary/50"}`} aria-current={step === index ? "step" : undefined}>
            <span className="flex items-center gap-2 text-xs font-semibold"><span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${index < step ? "border-primary bg-primary text-primary-foreground" : step === index ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>{index < step ? <Check className="size-3.5" /> : index + 1}</span><span className={step === index ? "text-foreground" : "text-muted-foreground"}>{label}</span></span>
            <span className="mt-2 hidden text-[10px] leading-4 text-muted-foreground sm:block">{stepDescriptions[index]}</span>
          </button>
        ))}
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div><p className="text-[10px] font-medium uppercase text-primary">Step {step + 1} of {stepLabels.length}</p><h2 className="mt-1 text-lg font-semibold">{stepLabels[step]}</h2><p className="mt-1 text-xs text-muted-foreground">{stepDescriptions[step]}</p></div>
        <span className="text-xs text-muted-foreground">{Math.round(((step + 1) / stepLabels.length) * 100)}%</span>
      </div>

      {Object.keys(errors).length ? <Alert variant="destructive"><AlertDescription>Review the highlighted fields before continuing.</AlertDescription></Alert> : null}

      {step === 0 ? (
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="study-name">Study name</Label>
            <Input id="study-name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(errors.name)} />
            <FieldError message={errors.name} />
            <p className="text-xs text-muted-foreground">The study code will be assigned automatically after the route country is validated.</p>
          </div>
          <div className="space-y-2"><Label htmlFor="study-type">Study mode</Label><Select value={studyType} onValueChange={(value) => changeStudyType(value as typeof studyType)}><SelectTrigger id="study-type" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="within_platform_pair">Within-platform paired testing</SelectItem><SelectItem value="cross_platform_comparison">Cross-platform comparison</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">Within-platform uses one provider. Cross-platform compares equivalent services from two providers.</p></div>
          <div className="space-y-2"><Label htmlFor="target-pairs">Target pair count</Label><Input id="target-pairs" type="number" min="1" value={targetPairCount} onChange={(event) => setTargetPairCount(event.target.value)} aria-invalid={Boolean(errors.targetPairCount)} /><FieldError message={errors.targetPairCount} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="isolated-variable">Isolated variable</Label><Input id="isolated-variable" value={isolatedVariable} onChange={(event) => setIsolatedVariable(event.target.value)} placeholder="Example: Account type" aria-invalid={Boolean(errors.isolatedVariable)} /><p className="text-xs text-muted-foreground">Enter the primary condition intentionally different between Tester A and Tester B.</p><FieldError message={errors.isolatedVariable} /></div>
          <div className="space-y-2 md:col-span-2"><Label htmlFor="study-question">Research question</Label><Textarea id="study-question" value={studyQuestion} onChange={(event) => setStudyQuestion(event.target.value)} placeholder="Example: Do Pro and Standard accounts receive different fares for the same controlled trip?" className="min-h-24" aria-invalid={Boolean(errors.studyQuestion)} /><FieldError message={errors.studyQuestion} /></div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-4">
            <div><p className="text-sm font-semibold">Build the initial route</p><p className="mt-1 text-xs text-muted-foreground">Set both public locations in the same country. Currency and timezone come from the pinned route.</p></div>
            <div className="flex items-center gap-2"><Badge variant={pickup ? "secondary" : "outline"}>{pickup ? <Check className="size-3" /> : null}Pickup {pickup ? "set" : "needed"}</Badge><Badge variant={destination ? "secondary" : "outline"}>{destination ? <Check className="size-3" /> : null}Destination {destination ? "set" : "needed"}</Badge></div>
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <section className="space-y-5 border-y border-border py-4 lg:sticky lg:top-20">
              <div className="space-y-2"><Label htmlFor="search-country">Search area</Label><Select value={searchCountry} onValueChange={(value) => changeCountry(value as "PH" | "US" | "CA")}><SelectTrigger id="search-country" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PH">Philippines</SelectItem><SelectItem value="US">United States</SelectItem><SelectItem value="CA">Canada</SelectItem></SelectContent></Select><p className="text-[10px] leading-4 text-muted-foreground">Changing the country clears both route pins.</p></div>

              <div className="space-y-2"><Label>Location to set</Label><div className="grid grid-cols-2 overflow-hidden rounded-md border border-border">{(["pickup", "destination"] as const).map((mode) => {
                const point = mode === "pickup" ? pickup : destination;
                return <button key={mode} type="button" onClick={() => changeActiveMode(mode)} className={`min-h-16 px-3 py-2 text-left transition-colors ${activeMode === mode ? "bg-primary/[0.08] text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}><span className="flex items-center gap-2 text-xs font-semibold capitalize">{mode === "pickup" ? <MapPin className="size-3.5 text-primary" /> : <MapPin className="size-3.5 text-amber-500" />}{mode}{point ? <Check className="ml-auto size-3.5 text-primary" /> : null}</span><span className="mt-1.5 block truncate text-[10px] font-normal text-muted-foreground">{point?.label ?? "Not set"}</span></button>;
              })}</div></div>

              <div className="space-y-3"><Label>Entry method</Label><div className="grid grid-cols-2 rounded-md border border-border p-1"><Button type="button" size="sm" variant={locationEntryMode === "search" ? "secondary" : "ghost"} onClick={() => setLocationEntryMode("search")}><Search className="size-4" />Search</Button><Button type="button" size="sm" variant={locationEntryMode === "coordinates" ? "secondary" : "ghost"} onClick={() => setLocationEntryMode("coordinates")}><LocateFixed className="size-4" />Coordinates</Button></div><Button type="button" className="w-full" variant="outline" onClick={useCurrentLocation} disabled={locating || resolving}>{locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}{locating ? "Locating..." : `Use current location for ${activeMode}`}</Button></div>

              {locationEntryMode === "search" ? <div className="space-y-2"><Label htmlFor="route-location-search">Search {activeMode}</Label><div className="flex gap-2"><Input id="route-location-search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} placeholder={`Search in ${{ PH: "the Philippines", US: "the United States", CA: "Canada" }[searchCountry]}`} /><Button type="button" size="icon" variant="outline" aria-label={`Search ${activeMode}`} title={`Search ${activeMode}`} onClick={() => void search()} disabled={searching || searchQuery.trim().length < 3}>{searching ? <LoaderCircle className="size-4 animate-spin" /> : <Search className="size-4" />}</Button></div></div> : null}

              {locationEntryMode === "coordinates" ? <div className="space-y-3"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="custom-latitude">Latitude</Label><Input id="custom-latitude" inputMode="decimal" value={customLatitude} onChange={(event) => setCustomLatitude(event.target.value)} placeholder="14.5995" /></div><div className="space-y-2"><Label htmlFor="custom-longitude">Longitude</Label><Input id="custom-longitude" inputMode="decimal" value={customLongitude} onChange={(event) => setCustomLongitude(event.target.value)} placeholder="120.9842" /></div></div><Button type="button" variant="outline" className="w-full" onClick={applyCustomCoordinates} disabled={resolving}><LocateFixed className="size-4" />Set {activeMode} coordinates</Button><FieldError message={errors.coordinates} /></div> : null}

              {searchResults.length ? <div className="space-y-2"><p className="text-[10px] font-medium uppercase text-muted-foreground">Search results</p><div className="max-h-56 divide-y divide-border overflow-y-auto border-y border-border">{searchResults.map((result) => <button type="button" key={`${result.externalPlaceId}-${result.latitude}`} onClick={() => assignPoint(result)} className="flex w-full items-start gap-3 px-1 py-3 text-left text-xs hover:bg-secondary/50"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span className="leading-5">{result.formattedAddress}</span></button>)}</div></div> : null}
            </section>

            <div className="relative min-w-0"><StudyRouteMap countryCode={searchCountry} activeMode={activeMode} pickup={pickup} destination={destination} onCoordinatesChange={(mode, lat, lng) => void resolveCoordinates(mode, lat, lng)} /><span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md border border-border bg-background/90 px-2.5 py-1.5 text-xs font-medium capitalize shadow-sm">{activeMode === "pickup" ? <MapPin className="size-3.5 text-primary" /> : <MapPin className="size-3.5 text-amber-500" />}Setting {activeMode}</span><span className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-border bg-background/90 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm">Click the map or drag a pin</span>{resolving ? <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md bg-background/90 px-2.5 py-1.5 text-xs text-muted-foreground"><LoaderCircle className="size-3.5 animate-spin" />Resolving location</span> : null}</div>
          </div>
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
          {pickup ? <Alert><AlertDescription>{studyType === "within_platform_pair" ? "Select one provider, then configure the ride tier for each tester side. The tiers may be the same or different." : "Select Tester A's reference provider and tier first, then choose one compatible provider and tier for Tester B."} Availability is based on the {pickup.countryCode} pickup market.</AlertDescription></Alert> : null}

          <section className="space-y-3">
            <div><h3 className="text-sm font-semibold">1. Select {studyType === "within_platform_pair" ? "a provider" : "two providers"}</h3><p className="mt-1 text-xs text-muted-foreground">The first cross-platform provider is assigned to Tester A and the second to Tester B.</p></div>
            <div className="divide-y divide-border rounded-md border border-border">
              {groupedProviders.map((provider) => {
                const selected = selectedPlatformIds.includes(provider.platformId);
                const lacksComparableTier = Boolean(studyType === "cross_platform_comparison" && selectedCrossCategory && !provider.tiers.some((tier) => tier.normalizedCategory === selectedCrossCategory));
                const waitingForTier = awaitingReferenceTier && !selected;
                const providerDisabled = lacksComparableTier || waitingForTier || (studyType === "cross_platform_comparison" && selectedPlatformIds.length >= 2 && !selected);
                const categoryLabel = selectedCrossCategory?.replaceAll("_", " ");
                return <label key={provider.platformId} className={`flex min-h-14 items-center gap-3 px-4 py-3 ${providerDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-secondary"}`}>{studyType === "within_platform_pair" ? <input type="radio" name="study-provider" checked={selected} onChange={() => selectWithinProvider(provider.platformId)} className="size-4 accent-primary" /> : <Checkbox disabled={providerDisabled} checked={selected} onCheckedChange={(checked) => toggleCrossProvider(provider.platformId, checked === true)} />}<span className="min-w-0 flex-1"><span className="block text-sm font-medium">{provider.platformName}</span><span className="block text-xs capitalize text-muted-foreground">{waitingForTier ? "Select the reference tier first" : lacksComparableTier ? `No ${categoryLabel} tier` : selectedCrossCategory ? `${categoryLabel} tier available` : `${provider.tiers.length} available ride ${provider.tiers.length === 1 ? "tier" : "tiers"}`}</span></span>{selected ? <Check className="size-4 text-primary" /> : null}</label>;
              })}
            </div>
            <FieldError message={errors.providers} />
          </section>

          <section className="space-y-3 border-t border-border pt-5">
            {studyType === "within_platform_pair" ? <div className="grid gap-2 sm:max-w-sm"><Label htmlFor="within-comparison-design">Ride-tier setup</Label><Select value={withinComparisonDesign} onValueChange={(value) => changeWithinComparisonDesign(value as typeof withinComparisonDesign)} disabled={!selectedWithinProvider}><SelectTrigger id="within-comparison-design" className="w-full"><SelectValue placeholder="Select a provider first" /></SelectTrigger><SelectContent><SelectItem value="same_tier">Same ride tier</SelectItem><SelectItem value="different_tier" disabled={!selectedWithinProviderHasMultipleTiers}>Different ride tiers</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">{!selectedWithinProvider ? "Select a provider before choosing the ride-tier setup." : selectedWithinProviderHasMultipleTiers ? "Use the same tier when another condition, such as account type, is the isolated variable." : `${selectedWithinProvider.platformName} has only one available ride tier, so both tester sides must use it.`}</p></div> : null}
            <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">2. Configure each tester side</h3><p className="mt-1 text-xs text-muted-foreground">These services become locked study controls and are inherited by every assignment.</p></div>{selectedServices.length ? <Button type="button" size="sm" variant="ghost" onClick={clearTierSelections}>Clear tiers</Button> : null}</div>
            {selectedPlatformIds.length ? <div className="grid gap-4 lg:grid-cols-2">{(["tester_a", "tester_b"] as const).map((side, sideIndex) => {
              const platformId = studyType === "within_platform_pair" ? selectedPlatformIds[0] : selectedPlatformIds[sideIndex];
              const provider = groupedProviders.find((group) => group.platformId === platformId);
              const selectedId = side === "tester_a" ? testerAServiceId : testerBServiceId;
              return <section key={side} className="rounded-md border border-border p-4"><div className="mb-3"><p className="text-[10px] font-medium uppercase text-primary">{side === "tester_a" ? "Tester A" : "Tester B"}</p><h4 className="mt-1 text-sm font-semibold">{provider?.platformName ?? (studyType === "cross_platform_comparison" ? "Select a provider" : "Provider unavailable")}</h4></div>{provider ? <div className="space-y-2">{provider.tiers.map((tier) => {
                const incompatible = Boolean(
                  (studyType === "cross_platform_comparison" && side === "tester_b" && selectedCrossCategory && tier.normalizedCategory !== selectedCrossCategory)
                  || (studyType === "within_platform_pair" && withinComparisonDesign === "different_tier" && (side === "tester_a" ? testerBServiceId : testerAServiceId) === tier.id)
                );
                return <label key={tier.id} className={`flex min-h-16 items-center gap-3 rounded-md border p-3 ${incompatible ? "cursor-not-allowed border-border opacity-50" : selectedId === tier.id ? "cursor-pointer border-primary bg-primary/5" : "cursor-pointer border-border hover:bg-secondary"}`}><input type="radio" name={`${side}-ride-tier`} disabled={incompatible} checked={selectedId === tier.id} onChange={() => selectSideService(side, tier)} className="size-4 accent-primary" /><span className="min-w-0"><span className="block text-sm font-medium">{tier.serviceName}</span><span className="block text-xs capitalize text-muted-foreground">{tier.normalizedCategory.replaceAll("_", " ")}{incompatible ? " · Not comparable" : ""}</span></span></label>;
              })}</div> : <p className="py-6 text-center text-xs text-muted-foreground">Select {side === "tester_a" ? "the first" : "the second"} provider above.</p>}<FieldError message={errors[side === "tester_a" ? "testerAServiceId" : "testerBServiceId"]} /></section>;
            })}</div> : <div className="border-y border-border py-8 text-center text-sm text-muted-foreground">Select {studyType === "within_platform_pair" ? "a provider" : "Tester A's provider"} above to configure ride tiers.</div>}
            <FieldError message={errors.tiers} />
            {!marketProviders.length ? <p className="text-sm text-muted-foreground">No provider services are configured for this pinned market yet.</p> : null}
          </section>
          <section className="space-y-4 border-t border-border pt-5">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-sm font-semibold">3. Operating-system restriction <span className="font-normal text-muted-foreground">(optional)</span></h3><p className="mt-1 text-xs text-muted-foreground">Turn this on only when tester operating systems must be controlled for assignment eligibility.</p></div><label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"><Checkbox checked={deviceRestrictionEnabled} onCheckedChange={(checked) => { setDeviceRestrictionEnabled(checked === true); setDeviceComparisonDesign("same_operating_system"); setTesterBOperatingSystem(testerAOperatingSystem); setErrors({}); }} />Require specific operating systems</label></div>
            {deviceRestrictionEnabled ? <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="device-comparison-design">OS rule</Label><Select value={deviceComparisonDesign} onValueChange={(value) => { const design = value as typeof deviceComparisonDesign; setDeviceComparisonDesign(design); if (design === "same_operating_system") setTesterBOperatingSystem(testerAOperatingSystem); else { setTesterAOperatingSystem("iOS"); setTesterBOperatingSystem("Android"); } setErrors({}); }}><SelectTrigger id="device-comparison-design" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="same_operating_system">Same OS on both sides</SelectItem><SelectItem value="different_operating_system">Different OS per side</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="tester-a-os">Tester A operating system</Label><Select value={testerAOperatingSystem} onValueChange={(value) => { const os = value as typeof testerAOperatingSystem; setTesterAOperatingSystem(os); setTesterBOperatingSystem(deviceComparisonDesign === "same_operating_system" ? os : os === "iOS" ? "Android" : "iOS"); setErrors({}); }}><SelectTrigger id="tester-a-os" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="iOS" disabled={deviceComparisonDesign === "different_operating_system" && testerBOperatingSystem === "iOS"}>iOS</SelectItem><SelectItem value="Android" disabled={deviceComparisonDesign === "different_operating_system" && testerBOperatingSystem === "Android"}>Android</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="tester-b-os">Tester B operating system</Label><Select value={testerBOperatingSystem} onValueChange={(value) => { const os = value as typeof testerBOperatingSystem; setTesterBOperatingSystem(os); if (deviceComparisonDesign === "different_operating_system") setTesterAOperatingSystem(os === "iOS" ? "Android" : "iOS"); setErrors({}); }} disabled={deviceComparisonDesign === "same_operating_system"}><SelectTrigger id="tester-b-os" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="iOS" disabled={deviceComparisonDesign === "different_operating_system" && testerAOperatingSystem === "iOS"}>iOS</SelectItem><SelectItem value="Android" disabled={deviceComparisonDesign === "different_operating_system" && testerAOperatingSystem === "Android"}>Android</SelectItem></SelectContent></Select><p className="text-xs text-muted-foreground">{deviceComparisonDesign === "same_operating_system" ? "Matches Tester A automatically." : `Must differ from Tester A (${testerAOperatingSystem}).`}</p></div>
            </div> : <div className="rounded-md border border-border bg-secondary/20 px-4 py-3 text-xs leading-5 text-muted-foreground">No OS restriction. Coordinators may assign any eligible tester regardless of whether their device uses iOS or Android.</div>}
            <FieldError message={errors.operatingSystems} />
          </section>
          <section className="space-y-4 border-t border-border pt-5">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-sm font-semibold">4. Testing synchronization <span className="font-normal text-muted-foreground">(optional)</span></h3><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Keep synchronized testing unless the methodology intentionally permits the two observations to occur at different times.</p></div><label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-medium"><Checkbox checked={testingSynchronization === "asynchronous"} onCheckedChange={(checked) => setTestingSynchronization(checked === true ? "asynchronous" : "synchronized")} />Allow separate tester windows</label></div>
            <div className={`rounded-md border px-4 py-3 text-xs leading-5 ${testingSynchronization === "asynchronous" ? "border-amber-400/30 bg-amber-400/5" : "border-primary/25 bg-primary/[0.025]"}`}><p className="font-medium text-foreground">{testingSynchronization === "asynchronous" ? "Asynchronous comparison" : "Synchronized paired session"}</p><p className="mt-1 text-muted-foreground">{testingSynchronization === "asynchronous" ? "Assignments will schedule Tester A and Tester B independently. Request-time synchronization will be marked not applicable; location-distance and pickup-proximity validation remain required." : "Both testers share one assignment window and their quote timestamps are compared against the protocol threshold."}</p></div>
          </section>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6">
          <section className="space-y-4">
            <div><h3 className="text-sm font-semibold">Collection window</h3><p className="mt-1 text-xs text-muted-foreground">Dates and times are interpreted in {pickup?.timezone ?? "the route timezone"}.</p></div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="testing-start">Testing starts</Label><Input id="testing-start" type="datetime-local" min={minimumTestingStart} value={testingStartsAt} onChange={(event) => { setTestingStartsAt(event.target.value); if (testingEndsAt && event.target.value >= testingEndsAt) setTestingEndsAt(""); setErrors({}); }} aria-invalid={Boolean(errors.testingStartsAt || errors.schedule)} /><FieldError message={errors.testingStartsAt} /></div>
              <div className="space-y-2"><Label htmlFor="testing-end">Testing ends</Label><Input id="testing-end" type="datetime-local" min={minimumTestingEnd} value={testingEndsAt} onChange={(event) => { setTestingEndsAt(event.target.value); setErrors({}); }} aria-invalid={Boolean(errors.testingEndsAt || errors.schedule)} /><FieldError message={errors.testingEndsAt} /></div>
            </div>
            <FieldError message={errors.schedule} />
          </section>
          <div className="border-t border-border pt-5"><h3 className="text-sm font-semibold">Study summary</h3><p className="mt-1 text-xs text-muted-foreground">Confirm the controlled study design before creation.</p></div>
          <div className="grid gap-4 border-y border-border py-5 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Study</p><p className="mt-1 text-sm font-medium">{name}</p><p className="mt-1 text-xs text-muted-foreground">Code assigned automatically</p></div>
            <div><p className="text-xs text-muted-foreground">Route</p><p className="mt-1 text-sm font-medium">{routeName}</p><p className="mt-1 text-xs text-muted-foreground">{pickup?.countryCode} · {pickup?.currencyCode}</p></div>
            <div><p className="text-xs text-muted-foreground">Timezone</p><p className="mt-1 text-sm font-medium">{pickup?.timezone ?? "Pending route"}</p><p className="mt-1 text-xs text-muted-foreground">Derived from pickup pin</p></div>
            <div><p className="text-xs text-muted-foreground">Providers</p><p className="mt-1 text-sm font-medium">{new Set(selectedProviderOptions.map((option) => option.platformId)).size}</p><p className="mt-1 text-xs text-muted-foreground">{selectedProviderOptions.length} selected services</p></div>
          </div>
          <div className="grid gap-4 border-y border-border py-4 sm:grid-cols-2"><div><p className="text-[10px] uppercase text-muted-foreground">Isolated variable</p><p className="mt-1 text-sm font-medium">{isolatedVariable}</p></div><div><p className="text-[10px] uppercase text-muted-foreground">Target usable pairs</p><p className="mt-1 text-sm font-medium">{targetPairCount}</p></div><div className="sm:col-span-2"><p className="text-[10px] uppercase text-muted-foreground">Research question</p><p className="mt-1 text-sm leading-6">{studyQuestion}</p></div></div>
          <div className="space-y-3"><h3 className="text-sm font-semibold">Provider and ride tiers</h3><div className="divide-y divide-border border-y border-border">{selectedProviderGroups.map((provider) => <div key={provider.platformId} className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]"><p className="text-sm font-medium">{provider.platformName}</p><p className="text-xs leading-5 text-muted-foreground">{provider.tiers.filter((tier) => selectedServices.includes(tier.id)).map((tier) => tier.serviceName).join(", ")}</p></div>)}</div></div>
          <div className="space-y-3"><h3 className="text-sm font-semibold">Device condition</h3>{deviceRestrictionEnabled ? <div className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2 sm:divide-x sm:divide-border"><div className="p-4"><p className="text-[10px] uppercase text-primary">Tester A</p><p className="mt-1 text-sm font-medium">{testerAOperatingSystem}</p></div><div className="p-4"><p className="text-[10px] uppercase text-amber-400">Tester B</p><p className="mt-1 text-sm font-medium">{testerBOperatingSystem}</p><p className="mt-1 text-xs text-muted-foreground">{deviceComparisonDesign === "different_operating_system" ? "Different OS restriction" : "Same OS restriction"}</p></div></div> : <div className="rounded-md border border-border px-4 py-3 text-sm"><p className="font-medium">No OS restriction</p><p className="mt-1 text-xs text-muted-foreground">Tester operating systems are recorded but do not restrict assignment eligibility.</p></div>}</div>
          <div className="space-y-3"><h3 className="text-sm font-semibold">Testing synchronization</h3><div className="rounded-md border border-border px-4 py-3"><p className="text-sm font-medium">{testingSynchronization === "synchronized" ? "Synchronized paired session" : "Separate tester windows"}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{testingSynchronization === "synchronized" ? "Both testers use one shared assignment window and the request-time gap is validated." : "Tester A and Tester B may test at different times. Request-time synchronization is not applicable, while GPS distance and pickup proximity checks remain active."}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="border-l-2 border-primary pl-3"><p className="text-xs font-medium">Pickup</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{pickup?.label}<br />{pickup?.formattedAddress}</p></div><div className="border-l-2 border-amber-400 pl-3"><p className="text-xs font-medium">Destination</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{destination?.label}<br />{destination?.formattedAddress}</p></div></div>
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-background/95 py-4 backdrop-blur">
        <Button type="button" variant="outline" onClick={() => goToStep(Math.max(0, step - 1))} disabled={step === 0}><ChevronLeft className="size-4" /><span className="sm:hidden">Back</span><span className="hidden sm:inline">{step === 0 ? "Back" : stepLabels[step - 1]}</span></Button>
        {step < 3 ? <Button type="button" onClick={() => goToStep(step + 1)}><span className="sm:hidden">Continue</span><span className="hidden sm:inline">Continue to {stepLabels[step + 1]}</span><ChevronRight className="size-4" /></Button> : <Button type="button" onClick={submit} disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? (initialData ? "Saving changes..." : "Creating study...") : (initialData ? "Save study changes" : "Create study")}</Button>}
      </div>
    </div>
  );
}

function StudyLifecycleControl({ study, canArchive, readiness }: { study: Study; canArchive: boolean; readiness?: StudyCompletionReadiness }) {
  const [open, setOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendUntil, setExtendUntil] = useState("");
  const [pending, startTransition] = useTransition();
  const transition = study.status === "draft" ? { status: "active" as const, label: "Activate", icon: Play, description: "Activation requires an active protocol and route, and enables assignment collection." }
    : study.status === "active" ? { status: "paused" as const, label: "Pause", icon: Pause, description: "Pausing blocks new assignments, tester submissions, and evidence uploads." }
    : study.status === "paused" ? { status: "active" as const, label: "Resume", icon: Play, description: "Resuming reopens assignment and tester collection workflows." }
    : study.status === "completed" && canArchive ? { status: "archived" as const, label: "Archive", icon: Archive, description: "Archiving is permanent and keeps the study available as read-only history." }
    : null;
  const Icon = transition?.icon;
  function submit(status: "active" | "paused" | "completed" | "archived") {
    startTransition(async () => {
      const result = await transitionStudyStatusAction(study.id, status);
      if (result.ok) { toast.success(result.message); setOpen(false); setCompleteOpen(false); }
      else toast.error(result.message);
    });
  }
  function extend() {
    if (!extendUntil) return toast.error("Choose a new testing end date and time.");
    startTransition(async () => {
      const result = await extendStudyTestingPeriodAction(study.id, fromZonedTime(extendUntil, study.display_timezone).toISOString());
      if (result.ok) { toast.success(result.message); setExtendOpen(false); setExtendUntil(""); }
      else toast.error(result.message);
    });
  }
  if (study.status === "archived") return null;
  const currentTestingEnd = study.testing_ends_at ? formatInTimeZone(new Date(study.testing_ends_at), study.display_timezone, "yyyy-MM-dd'T'HH:mm") : undefined;
  const currentTestingEndLabel = study.testing_ends_at ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: study.display_timezone }).format(new Date(study.testing_ends_at)) : "Not set";
  return <div className="flex items-center gap-1">{["active", "paused"].includes(study.status) ? <Dialog open={extendOpen} onOpenChange={setExtendOpen}><DialogTrigger asChild><Button size="sm" variant="ghost"><CalendarClock className="size-3.5" />Extend window</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Extend testing period</DialogTitle><DialogDescription>Collection remains closed until the new end is saved. The extension is recorded in the activity log.</DialogDescription></DialogHeader><div className="space-y-3"><div className="rounded-md border border-border bg-secondary/25 px-3 py-2 text-xs"><p className="text-muted-foreground">Current testing end</p><p className="mt-1 font-medium">{currentTestingEndLabel} ({study.display_timezone})</p></div><div className="space-y-2"><Label htmlFor={`extend-study-${study.id}`}>New testing end ({study.display_timezone})</Label><Input id={`extend-study-${study.id}`} type="datetime-local" value={extendUntil} onChange={(event) => setExtendUntil(event.target.value)} min={currentTestingEnd} /><p className="text-[10px] text-muted-foreground">Dates before the current study end are unavailable. The new end must also be in the future.</p></div></div><DialogFooter><Button variant="outline" onClick={() => setExtendOpen(false)} disabled={pending}>Cancel</Button><Button onClick={extend} disabled={pending}>{pending ? "Extending..." : "Extend collection"}</Button></DialogFooter></DialogContent></Dialog> : null}{transition ? <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline">{Icon ? <Icon className="size-3.5" /> : null}{transition.label}</Button></DialogTrigger><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{transition.label} {study.name}?</DialogTitle><DialogDescription>{transition.description}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button><Button onClick={() => submit(transition.status)} disabled={pending}>{pending ? "Updating..." : transition.label}</Button></DialogFooter></DialogContent></Dialog> : null}{["active", "paused"].includes(study.status) ? <Dialog open={completeOpen} onOpenChange={setCompleteOpen}><DialogTrigger asChild><Button size="sm" variant="ghost"><CircleCheck className="size-3.5" />Complete</Button></DialogTrigger><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>Study completion readiness</DialogTitle><DialogDescription>{study.name} can be completed only after the target number of accepted, usable pairs and all final review work are complete.</DialogDescription></DialogHeader>{readiness ? <div className="space-y-4"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4"><ReadinessMetric label="Assignments closed" value={`${readiness.assignments.completed + readiness.assignments.cancelled + readiness.assignments.expired}/${readiness.assignments.total}`} /><ReadinessMetric label="Pairs processed" value={`${readiness.pairs.technically_processed}/${readiness.pairs.total}`} /><ReadinessMetric label="Target progress" value={`${readiness.pairs.accepted_usable}/${study.target_pair_count ?? "Not set"}`} /><ReadinessMetric label="Still needed" value={readiness.pairs.replacement_needed} /></div><div className="rounded-md border border-border bg-secondary/25 px-3 py-2 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">A pair counts toward the target when it is accepted with complete required evidence.</span> It may either be technically usable or be accepted with a documented technical exception. Rejected pairs do not count; legacy flagged records must be resolved before completion.</div><div className={`rounded-md border p-3 text-xs ${readiness.ready ? "border-primary/30 bg-primary/5" : "border-amber-500/25 bg-amber-500/5"}`}><p className="font-semibold">{readiness.ready ? "Ready to complete" : "What still needs attention"}</p>{readiness.blockers.length ? <ul className="mt-2 space-y-1 text-muted-foreground">{readiness.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p className="mt-1 text-muted-foreground">The study will become read-only for collection after completion.</p>}</div><div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-border pt-3 text-[10px] text-muted-foreground sm:grid-cols-5"><span><strong className="text-foreground">{readiness.reviews.accepted}</strong> accepted reviews</span><span><strong className="text-foreground">{readiness.reviews.accepted_with_exception}</strong> technical exceptions</span><span><strong className="text-foreground">{readiness.reviews.flagged}</strong> legacy flagged</span><span><strong className="text-foreground">{readiness.reviews.rejected}</strong> rejected</span><span><strong className="text-foreground">{readiness.reviews.pending}</strong> awaiting review</span></div></div> : <p className="text-sm text-muted-foreground">Readiness information is unavailable.</p>}<DialogFooter><Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={pending}>Close</Button><Button onClick={() => submit("completed")} disabled={pending || !readiness?.ready}>{pending ? "Completing..." : "Complete study"}</Button></DialogFooter></DialogContent></Dialog> : null}</div>;
}

function ReadinessMetric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-md border border-border p-3"><p className="text-[9px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>;
}

function DraftStudyActions({ study }: { study: Study }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteDraftStudyAction(study.id);
      if (result.ok) { toast.success(result.message); setDeleteOpen(false); router.refresh(); }
      else toast.error(result.message);
    });
  }

  return <>
    <Button asChild size="sm" variant="outline"><Link href={`/paired-testing-demo/studies/${study.id}/edit`}><Pencil className="size-3.5" />Edit</Link></Button>
    <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
      <DialogTrigger asChild><Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" aria-label={`Delete ${study.name}`} title="Delete study"><Trash2 className="size-4" /></Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Delete draft study?</DialogTitle><DialogDescription>This permanently deletes {study.name}, its route, members, and any draft protocol work. This action cannot be undone.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>Cancel</Button><Button variant="destructive" onClick={remove} disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}{pending ? "Deleting..." : "Delete study"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function StudyList({ studies, activeStudyId, activeProtocolStudyIds, canArchive, readiness, providerOptions }: { studies: Study[]; activeStudyId: string | null; activeProtocolStudyIds: string[]; canArchive: boolean; readiness: Record<string, StudyCompletionReadiness>; providerOptions: ProviderServiceOption[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filteredStudies = useMemo(() => studies.filter((study) => {
    const needle = query.trim().toLowerCase();
    const services = configuredStudyServices(study, providerOptions).map((service) => `${service.platformName} ${service.serviceName}`).join(" ");
    return (status === "all" || study.status === status)
      && (!needle || `${study.name} ${study.study_code} ${services}`.toLowerCase().includes(needle));
  }), [providerOptions, query, status, studies]);
  function select(study: Study) {
    setPendingId(study.id);
    void selectStudyAction(study.id).then((result) => {
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
      setPendingId(null);
    });
  }
  const summary = [
    { label: "All studies", value: studies.length },
    { label: "Active", value: studies.filter((study) => study.status === "active").length },
    { label: "Draft", value: studies.filter((study) => study.status === "draft").length },
    { label: "Completed history", value: studies.filter((study) => ["completed", "archived"].includes(study.status)).length },
  ];
  return <div className="space-y-4"><div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{summary.map((item) => <div key={item.label} className="rounded-md border border-border bg-secondary/15 px-4 py-3"><p className="text-[10px] uppercase text-muted-foreground">{item.label}</p><p className="mt-1 text-xl font-semibold">{item.value}</p></div>)}</div><div className="flex flex-col gap-3 border-y border-border py-3 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code, provider, or tier" className="pl-9" /></div><Select value={status} onValueChange={setStatus}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent></Select></div><div className="overflow-x-auto rounded-md border border-border"><Table><TableHeader className="bg-secondary/45"><TableRow><TableHead>Study</TableHead><TableHead>Mode</TableHead><TableHead>Status</TableHead><TableHead>Currency</TableHead><TableHead>Updated</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{filteredStudies.map((study) => {
    const serviceLabel = configuredStudyServices(study, providerOptions).map((service) => `${service.platformName} · ${service.serviceName}`).join(" vs ");
    const canManageDraft = study.status === "draft" && !activeProtocolStudyIds.includes(study.id);
    return <TableRow key={study.id} className={study.id === activeStudyId ? "bg-primary/[0.035]" : undefined}><TableCell className="min-w-72 whitespace-normal"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{study.name}</p>{study.id === activeStudyId ? <Badge variant="outline">Current workspace</Badge> : null}</div><p className="mono mt-1 text-[10px] text-muted-foreground">{study.study_code}</p>{serviceLabel ? <p className="mt-2 text-xs font-medium text-primary">{serviceLabel}</p> : <p className="mt-2 text-xs text-muted-foreground">Testing service not configured</p>}</TableCell><TableCell className="text-xs">{study.study_type === "within_platform_pair" ? "Within platform" : "Cross platform"}</TableCell><TableCell><Badge variant={study.status === "active" ? "default" : "outline"} className="capitalize">{study.status}</Badge></TableCell><TableCell>{study.default_currency ?? "-"}</TableCell><TableCell className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(study.updated_at))}</TableCell><TableCell className="min-w-80"><div className="space-y-2"><div className="flex justify-end gap-2"><Button asChild size="sm" variant="outline"><Link href={`/paired-testing-demo/studies/${study.id}/members`}><Users className="size-3.5" />Members</Link></Button><Button size="sm" variant={study.id === activeStudyId ? "secondary" : "default"} disabled={study.id === activeStudyId || pendingId === study.id} onClick={() => select(study)}>{pendingId === study.id ? <LoaderCircle className="size-4 animate-spin" /> : study.id === activeStudyId ? <Check className="size-4" /> : null}{study.id === activeStudyId ? "Selected" : "Select study"}</Button></div>{canManageDraft || study.status !== "archived" ? <div className="flex flex-wrap items-center justify-end gap-1 border-t border-border pt-2"><span className="mr-auto text-[9px] uppercase text-muted-foreground">Manage</span>{canManageDraft ? <DraftStudyActions study={study} /> : null}<StudyLifecycleControl study={study} canArchive={canArchive} readiness={readiness[study.id]} /></div> : null}</div></TableCell></TableRow>;
  })}{!filteredStudies.length ? <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">No studies match the current filters.</TableCell></TableRow> : null}</TableBody></Table></div><p className="text-xs text-muted-foreground">Showing {filteredStudies.length} of {studies.length} studies</p></div>;
}

export function StudiesManager({ studies, activeStudyId, activeProtocolStudyIds, providerOptions, role, readiness }: { studies: Study[]; activeStudyId: string | null; activeProtocolStudyIds: string[]; providerOptions: ProviderServiceOption[]; role: AppRole; readiness: Record<string, StudyCompletionReadiness> }) {
  const [tab, setTab] = useState("studies");
  return <Tabs value={tab} onValueChange={setTab}><div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between"><div><TabsList><TabsTrigger value="studies">Study register</TabsTrigger><TabsTrigger value="create">Create study</TabsTrigger></TabsList><p className="mt-2 text-xs text-muted-foreground">Select a study to load its workspace, or manage its members and lifecycle.</p></div><Button onClick={() => setTab("create")}><Plus className="size-4" />New study</Button></div><TabsContent value="studies" className="mt-5"><StudyList studies={studies} activeStudyId={activeStudyId} activeProtocolStudyIds={activeProtocolStudyIds} canArchive={role === "admin"} readiness={readiness} providerOptions={providerOptions} /></TabsContent><TabsContent value="create" className="mt-5"><CreateStudyForm providerOptions={providerOptions} /></TabsContent></Tabs>;
}
