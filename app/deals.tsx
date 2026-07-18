import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "../lib/theme";
import { useThemeStore } from "../store/themeStore";
import { typography } from "../lib/typography";
import {
  getListings,
  getMySavedDealIds,
  toggleSaveDeal,
  type VendorDeal,
} from "../lib/vendors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 40) / 2;
const BANNER_WIDTH = width - 32;

const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍛",
  Print: "🖨️",
  Beauty: "💈",
  Academic: "📚",
  Health: "🏋️",
  Tech: "💻",
  Fashion: "👗",
  Other: "🏪",
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#F59E0B",     // Amber
  Print: "#3B82F6",    // Blue
  Beauty: "#EC4899",   // Pink
  Academic: "#8B5CF6", // Purple
  Health: "#EF4444",   // Red
  Tech: "#10B981",     // Emerald
  Fashion: "#F97316",  // Orange
  Other: "#6B7280",    // Gray
};

const CATEGORY_VECTOR_ICONS: Record<string, string> = {
  Food: "fast-food-outline",
  Print: "print-outline",
  Beauty: "cut-outline",
  Academic: "book-outline",
  Health: "fitness-outline",
  Tech: "laptop-outline",
  Fashion: "shirt-outline",
  Other: "grid-outline",
};

const GRID_CATEGORIES = [
  { name: "Food", label: "Food" },
  { name: "Academic", label: "Study" },
  { name: "Fashion", label: "Style" },
  { name: "Tech", label: "Gadgets" },
  { name: "Beauty", label: "Salon" },
  { name: "Health", label: "Fitness" },
  { name: "Print", label: "Print" },
  { name: "Other", label: "Other" },
];

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#8B5CF6";
}

function getCategoryIcon(category: string, vendorIcon?: string | null): string {
  if (vendorIcon) return vendorIcon;
  return CATEGORY_ICONS[category] ?? "🏪";
}

const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    Haptics.impactAsync(style);
  } catch {
    // Ignore on unsupported systems
  }
};

export default function DealsScreen() {
  const theme = useTheme();
  const [deals, setDeals] = useState<VendorDeal[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Redemption Modal State
  const [selectedDeal, setSelectedDeal] = useState<VendorDeal | null>(null);
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const feedMode = useThemeStore((s) => s.feedMode);
  const activeUniversity = useThemeStore((s) => s.activeUniversity);
  const uniId = feedMode === 'local' ? activeUniversity?.id : null;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [dealsRes, savedSet] = await Promise.all([
        getListings(undefined, uniId),
        getMySavedDealIds(),
      ]);
      setDeals(dealsRes.data ?? []);
      setSavedIds(savedSet);
    } catch {
      Toast.show({ type: "error", text1: "Could not load deals" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [uniId]);

  useEffect(() => {
    load();
  }, [load, feedMode, activeUniversity?.id]);

  const handleToggleSave = async (deal: VendorDeal) => {
    if (savingId) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSavingId(deal.id);

    // Optimistic update
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(deal.id)) next.delete(deal.id);
      else next.add(deal.id);
      return next;
    });

    const { data, error } = await toggleSaveDeal(deal.id);
    if (error || !data) {
      // Rollback
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(deal.id)) next.delete(deal.id);
        else next.add(deal.id);
        return next;
      });
      Toast.show({ type: "error", text1: "Could not save deal" });
    } else {
      Toast.show({
        type: "success",
        text1: data.saved ? "Added to Bookmarks" : "Removed from Bookmarks",
        position: "bottom",
      });
    }
    setSavingId(null);
  };

  const handleSelectCategory = (cat: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (activeCategory === cat) {
      setActiveCategory("All");
    } else {
      setActiveCategory(cat);
    }
  };

  const handleSelectVendor = (vendorId: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (selectedVendorId === vendorId) {
      setSelectedVendorId(null);
    } else {
      setSelectedVendorId(vendorId);
    }
  };

  const handleOpenRedeem = (deal: VendorDeal) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDeal(deal);
    setRedeemModalVisible(true);
  };

  const handleCopyCode = (code: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    try {
      Clipboard.setString(code);
      Toast.show({
        type: "success",
        text1: "Voucher Code Copied!",
        text2: code,
        position: "bottom",
      });
    } catch {
      Toast.show({ type: "error", text1: "Failed to copy code" });
    }
  };

  const handleConfirmRedeem = () => {
    setRedeeming(true);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      setRedeeming(false);
      setRedeemModalVisible(false);
      Toast.show({
        type: "success",
        text1: "Deal Redeemed Successfully!",
        text2: "Show the screen to the vendor cashier.",
        position: "bottom",
      });
    }, 1500);
  };

  // Extract unique vendors for Brand carousel
  const uniqueVendors = Array.from(
    new Map(
      deals
        .map((d) => d.vendors)
        .filter(Boolean)
        .map((v) => [v!.id, v!])
    ).values()
  );

  // Filtering deals
  const filtered = deals.filter((d) => {
    const cat = d.vendors?.category ?? "Other";
    const matchCat = activeCategory === "All" || cat === activeCategory;
    const matchVendor = !selectedVendorId || d.vendor_id === selectedVendorId;
    const matchSearch =
      (d.vendors?.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      (d.description ?? "").toLowerCase().includes(search.toLowerCase());
    const notExpired = !d.valid_until || new Date(d.valid_until) >= new Date();
    return matchCat && matchVendor && matchSearch && notExpired;
  });

  const getCardBg = () => (theme.dark ? "rgba(30, 41, 59, 0.45)" : "#FFFFFF");
  const getCardBorder = () => (theme.dark ? "rgba(255, 255, 255, 0.08)" : "#E5E7EB");

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]} edges={["top"]}>
      {/* Sleek Header */}
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            s.backBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[s.title, { color: theme.text }]}>Campus Deals</Text>
          <Text style={[s.subtitle, { color: theme.textFaint }]}>
            Student discounts exclusive to {activeUniversity?.name || "your campus"}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            s.headerActionBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            load(true);
          }}
        >
          <Ionicons name="sync-outline" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={theme.accent}
          />
        }
      >
        {/* Modern Search Box */}
        <View style={[s.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            placeholder="Search deals, foods, printing..."
            placeholderTextColor={theme.textFaint}
            style={[s.searchInput, { color: theme.text }]}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Promo Banners Carousel */}
        <ScrollView
          horizontal
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={BANNER_WIDTH + 12}
          snapToAlignment="center"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.bannerCarousel}
        >
          <LinearGradient
            colors={["#F97316", "#F59E0B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.promoBanner}
          >
            <View style={s.bannerLeft}>
              <Text style={s.bannerBadge}>EXCLUSIVE MEGA SALE</Text>
              <Text style={s.bannerTitle}>Craving Food?{"\n"}Save Big!</Text>
              <Text style={s.bannerDesc}>Up to 50% off campus cafes</Text>
            </View>
            <View style={s.bannerRight}>
              <Text style={s.bannerEmoji}>🍕</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={["#8B5CF6", "#EC4899"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.promoBanner}
          >
            <View style={s.bannerLeft}>
              <Text style={s.bannerBadge}>LATEST OFFERS</Text>
              <Text style={s.bannerTitle}>Academic &{"\n"}Print Services</Text>
              <Text style={s.bannerDesc}>Flat student-only rates</Text>
            </View>
            <View style={s.bannerRight}>
              <Text style={s.bannerEmoji}>📚</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={["#06B6D4", "#3B82F6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.promoBanner}
          >
            <View style={s.bannerLeft}>
              <Text style={s.bannerBadge}>POPULAR DEALS</Text>
              <Text style={s.bannerTitle}>Tech, Salon{"\n"}& Essentials</Text>
              <Text style={s.bannerDesc}>60% OFF with verified codes</Text>
            </View>
            <View style={s.bannerRight}>
              <Text style={s.bannerEmoji}>💻</Text>
            </View>
          </LinearGradient>
        </ScrollView>

        {/* Categories Section */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Categories</Text>
          {(activeCategory !== "All" || selectedVendorId || search) && (
            <TouchableOpacity
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setActiveCategory("All");
                setSelectedVendorId(null);
                setSearch("");
              }}
            >
              <Text style={[s.sectionLink, { color: theme.accent }]}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Horizontal Category Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryScroll}
        >
          {/* "All" Pill */}
          <TouchableOpacity
            style={[
              s.categoryPill,
              {
                backgroundColor: activeCategory === "All" ? `${theme.accent}1a` : getCardBg(),
                borderColor: activeCategory === "All" ? theme.accent : getCardBorder(),
              },
            ]}
            onPress={() => {
              triggerHaptic();
              setActiveCategory("All");
            }}
          >
            <Ionicons
              name="apps-outline"
              size={15}
              color={activeCategory === "All" ? theme.accent : theme.textMuted}
            />
            <Text
              style={[
                s.categoryPillText,
                {
                  color: activeCategory === "All" ? theme.text : theme.textMuted,
                  fontFamily: activeCategory === "All" ? typography.fontSemiBold : typography.fontRegular,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {/* Individual Categories */}
          {GRID_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.name;
            const catColor = getCategoryColor(cat.name);
            const vectorIcon = CATEGORY_VECTOR_ICONS[cat.name] || "grid-outline";
            return (
              <TouchableOpacity
                key={cat.name}
                style={[
                  s.categoryPill,
                  {
                    backgroundColor: isSelected ? `${catColor}15` : getCardBg(),
                    borderColor: isSelected ? catColor : getCardBorder(),
                  },
                ]}
                onPress={() => handleSelectCategory(cat.name)}
              >
                <Ionicons
                  name={vectorIcon as any}
                  size={15}
                  color={isSelected ? catColor : theme.textMuted}
                />
                <Text
                  style={[
                    s.categoryPillText,
                    {
                      color: isSelected ? theme.text : theme.textMuted,
                      fontFamily: isSelected ? typography.fontSemiBold : typography.fontRegular,
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured Brands (Vendors) Carousel */}
        {uniqueVendors.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={[s.sectionTitle, { color: theme.text, paddingHorizontal: 16, marginBottom: 10 }]}>
              Featured Campus Brands
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.brandCarousel}
            >
              {uniqueVendors.map((vendor) => {
                if (!vendor) return null;
                const isSelected = selectedVendorId === vendor.id;
                const borderActiveColor = theme.accent;
                return (
                  <TouchableOpacity
                    key={vendor.id}
                    style={[
                      s.brandCard,
                      {
                        backgroundColor: getCardBg(),
                        borderColor: isSelected ? borderActiveColor : getCardBorder(),
                      },
                    ]}
                    onPress={() => handleSelectVendor(vendor.id)}
                  >
                    <View
                      style={[
                        s.brandLogoBox,
                        { backgroundColor: theme.dark ? "rgba(255,255,255,0.05)" : "#F9FAFB" },
                      ]}
                    >
                      <Text style={{ fontSize: 22 }}>{vendor.icon || "🏪"}</Text>
                    </View>
                    <Text
                      style={[
                        s.brandName,
                        {
                          color: isSelected ? borderActiveColor : theme.text,
                          fontFamily: isSelected ? typography.fontMedium : typography.fontRegular,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {vendor.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Deals Listing (2-Column Grid) */}
        <View style={[s.sectionHeader, { marginTop: 24 }]}>
          <Text style={[s.sectionTitle, { color: theme.text }]}>Trending Deals</Text>
          <Text style={{ fontSize: 12, fontFamily: typography.fontRegular, color: theme.textMuted }}>
            {filtered.length} found
          </Text>
        </View>

        {loading ? (
          <View style={s.loaderContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[s.loadingText, { color: theme.textMuted }]}>Fetching deals near you...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={[s.emptyContainer, { backgroundColor: getCardBg(), borderColor: getCardBorder() }]}>
            <Text style={s.emptyEmoji}>🏪</Text>
            <Text style={[s.emptyTitle, { color: theme.text }]}>No Deals Found</Text>
            <Text style={[s.emptyDesc, { color: theme.textMuted }]}>
              There are no student discounts matching your filters right now. Try clearing filters!
            </Text>
            <TouchableOpacity
              style={[s.resetBtn, { backgroundColor: theme.accent }]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setActiveCategory("All");
                setSelectedVendorId(null);
                setSearch("");
              }}
            >
              <Text style={s.resetBtnText}>Show All Deals</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.dealsGrid}>
            {filtered.map((deal) => {
              const cat = deal.vendors?.category ?? "Other";
              const catColor = getCategoryColor(cat);
              const icon = getCategoryIcon(cat, deal.vendors?.icon);
              const isSaved = savedIds.has(deal.id);

              return (
                <TouchableOpacity
                  key={deal.id}
                  style={[
                    s.dealCard,
                    {
                      backgroundColor: getCardBg(),
                      borderColor: getCardBorder(),
                    },
                  ]}
                  onPress={() => handleOpenRedeem(deal)}
                  activeOpacity={0.8}
                >
                  {/* Top Image Container */}
                  <View
                    style={[
                      s.dealImageBlock,
                      { backgroundColor: theme.dark ? "rgba(255, 255, 255, 0.04)" : "#F3F4F6" },
                    ]}
                  >
                    {/* Glowing Accent Gradient Background inside placeholder */}
                    <LinearGradient
                      colors={theme.dark ? [`${catColor}15`, `${catColor}02`] : [`${catColor}0d`, `${catColor}02`]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Ionicons
                      name={(CATEGORY_VECTOR_ICONS[cat] || "grid-outline") as any}
                      size={28}
                      color={catColor}
                    />

                    {/* Bookmark Toggle */}
                    <TouchableOpacity
                      style={[
                        s.bookmarkBtn,
                        { backgroundColor: theme.dark ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.85)" },
                      ]}
                      onPress={() => handleToggleSave(deal)}
                      disabled={savingId === deal.id}
                    >
                      {savingId === deal.id ? (
                        <ActivityIndicator size="small" color={catColor} />
                      ) : (
                        <Ionicons
                          name={isSaved ? "heart" : "heart-outline"}
                          size={16}
                          color={isSaved ? "#EF4444" : theme.textMuted}
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Body Content */}
                  <View style={s.dealBody}>
                    <Text style={[s.dealVendor, { color: theme.textMuted }]} numberOfLines={1}>
                      {deal.vendors?.name ?? "Campus Vendor"}
                    </Text>
                    <Text style={[s.dealTitle, { color: theme.text }]} numberOfLines={2}>
                      {deal.title}
                    </Text>

                    {/* Ratings Placeholder - matching Ref UI */}
                    <View style={s.ratingRow}>
                      <View style={s.starRow}>
                        <Ionicons name="star" size={10} color="#F59E0B" />
                        <Ionicons name="star" size={10} color="#F59E0B" />
                        <Ionicons name="star" size={10} color="#F59E0B" />
                        <Ionicons name="star" size={10} color="#F59E0B" />
                        <Ionicons name="star" size={10} color="#F59E0B" />
                      </View>
                      <Text style={[s.ratingText, { color: theme.textFaint }]}>5.0</Text>
                    </View>

                    {/* Location */}
                    <Text style={[s.dealLocation, { color: theme.textFaint }]} numberOfLines={1}>
                      📍 {deal.vendors?.location_text ?? "On Campus"}
                    </Text>

                    {/* Price/Discount Row */}
                    <View style={s.dealFooter}>
                      <Text style={[s.dealDiscount, { color: catColor }]}>
                        {deal.discount}
                      </Text>
                      <View style={[s.miniRedeemBtn, { backgroundColor: `${catColor}15` }]}>
                        <Text style={[s.miniRedeemText, { color: catColor }]}>Claim</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* High Fidelity Redemption Modal (Voucher Coupon) */}
      <Modal
        visible={redeemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRedeemModalVisible(false)}
      >
        <View style={s.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setRedeemModalVisible(false)}
          />
          <View
            style={[
              s.modalContent,
              {
                backgroundColor: theme.dark ? "#0F172A" : "#FFFFFF",
                borderColor: theme.border,
              },
            ]}
          >
            {/* Handle Bar */}
            <View style={[s.modalHandle, { backgroundColor: theme.border }]} />

            {selectedDeal && (() => {
              const cat = selectedDeal.vendors?.category ?? "Other";
              const catColor = getCategoryColor(cat);
              const icon = getCategoryIcon(cat, selectedDeal.vendors?.icon);
              const isSaved = savedIds.has(selectedDeal.id);
              const promoCode = `FAF-${(selectedDeal.vendors?.name ?? "DEAL").replace(/\s+/g, "").slice(0, 3).toUpperCase()}-${selectedDeal.id.slice(0, 4).toUpperCase()}`;

              return (
                <View style={{ width: "100%", alignItems: "center" }}>
                  {/* Close & Wishlist Top controls */}
                  <View style={s.modalTopControls}>
                    <TouchableOpacity
                      style={[s.modalControlBtn, { backgroundColor: theme.card }]}
                      onPress={() => handleToggleSave(selectedDeal)}
                    >
                      <Ionicons
                        name={isSaved ? "heart" : "heart-outline"}
                        size={18}
                        color={isSaved ? "#EF4444" : theme.text}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.modalControlBtn, { backgroundColor: theme.card }]}
                      onPress={() => setRedeemModalVisible(false)}
                    >
                      <Ionicons name="close" size={18} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Header Visual */}
                  <View
                    style={[
                      s.modalVisualBadge,
                      { backgroundColor: `${catColor}15`, borderColor: `${catColor}35` },
                    ]}
                  >
                    <Ionicons
                      name={(CATEGORY_VECTOR_ICONS[cat] || "grid-outline") as any}
                      size={36}
                      color={catColor}
                    />
                  </View>

                  {/* Discount Header */}
                  <Text style={[s.modalDiscountText, { color: catColor }]}>
                    {selectedDeal.discount}
                  </Text>
                  <Text style={[s.modalVendorName, { color: theme.textMuted }]}>
                    {selectedDeal.vendors?.name ?? "Campus Vendor"}
                  </Text>

                  {/* Title & Description */}
                  <Text style={[s.modalDealTitle, { color: theme.text }]}>
                    {selectedDeal.title}
                  </Text>

                  {selectedDeal.description ? (
                    <Text style={[s.modalDealDesc, { color: theme.textMuted }]}>
                      {selectedDeal.description}
                    </Text>
                  ) : (
                    <Text style={[s.modalDealDesc, { color: theme.textFaint }]}>
                      Flash student discount at campus location. Show your mobile app at checkout to redeem this offer.
                    </Text>
                  )}

                  {/* Location & Valid Info */}
                  <View style={[s.modalInfoSection, { borderColor: theme.border }]}>
                    <View style={s.modalInfoRow}>
                      <Ionicons name="location-outline" size={16} color={theme.textMuted} />
                      <Text style={[s.modalInfoText, { color: theme.textMuted }]}>
                        {selectedDeal.vendors?.location_text ?? "On Campus Location"}
                      </Text>
                    </View>
                    {selectedDeal.valid_until && (
                      <View style={[s.modalInfoRow, { marginTop: 8 }]}>
                        <Ionicons name="time-outline" size={16} color={theme.textMuted} />
                        <Text style={[s.modalInfoText, { color: theme.textMuted }]}>
                          Valid Until: {new Date(selectedDeal.valid_until).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Coupon Cutout */}
                  <View style={[s.couponContainer, { borderColor: catColor, backgroundColor: theme.dark ? "rgba(255, 255, 255, 0.02)" : "#F9FAFB" }]}>
                    <Text style={[s.couponLabel, { color: theme.textFaint }]}>Redemption Promo Code</Text>
                    <View style={s.couponRow}>
                      <Text style={[s.couponCodeText, { color: theme.text }]}>{promoCode}</Text>
                      <TouchableOpacity
                        style={[s.couponCopyBtn, { backgroundColor: catColor }]}
                        onPress={() => handleCopyCode(promoCode)}
                      >
                        <Text style={s.couponCopyText}>Copy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* How to Redeem Instructions */}
                  <View style={s.instructionsBox}>
                    <Text style={[s.instructLabel, { color: theme.textFaint }]}>How to redeem:</Text>
                    <Text style={[s.instructText, { color: theme.textMuted }]}>
                      {selectedDeal.how_to_redeem}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={s.modalActions}>
                    <TouchableOpacity
                      style={[s.modalCancelBtn, { borderColor: theme.border }]}
                      onPress={() => setRedeemModalVisible(false)}
                    >
                      <Text style={[s.modalCancelText, { color: theme.text }]}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.modalRedeemBtn, { backgroundColor: catColor }]}
                      onPress={handleConfirmRedeem}
                      disabled={redeeming}
                    >
                      {redeeming ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={s.modalRedeemText}>Mark Redeemed</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Category card responsive width helper
const CATEGORY_WIDTH = (screenWidth: number) => {
  // width - margins (32) - gaps (24) / 4 columns
  return (screenWidth - 56) / 4;
};

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
  },
  title: {
    fontSize: 16,
    fontFamily: typography.fontBold,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: typography.fontRegular,
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 0.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: typography.fontRegular,
  },
  bannerCarousel: {
    paddingLeft: 16,
    paddingRight: 8,
    marginTop: 16,
    marginBottom: 20,
    gap: 12,
  },
  promoBanner: {
    width: BANNER_WIDTH,
    height: 128,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerLeft: {
    flex: 1,
    justifyContent: "center",
  },
  bannerBadge: {
    fontSize: 9,
    fontFamily: typography.fontBold,
    color: "rgba(255, 255, 255, 0.8)",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 18,
    fontFamily: typography.fontBold,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  bannerDesc: {
    fontSize: 11,
    fontFamily: typography.fontRegular,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 6,
  },
  bannerRight: {
    width: 70,
    height: 70,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerEmoji: {
    fontSize: 36,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: typography.fontBold,
  },
  sectionLink: {
    fontSize: 12,
    fontFamily: typography.fontMedium,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 15,
    gap: 8,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryPillText: {
    fontSize: 12,
  },
  brandCarousel: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 10,
  },
  brandCard: {
    width: 80,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 0.5,
    alignItems: "center",
    gap: 6,
  },
  brandLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 10,
    textAlign: "center",
    width: "90%",
  },
  dealsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    rowGap: 14,
  },
  dealCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  dealImageBlock: {
    height: 100,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dealEmoji: {
    fontSize: 32,
  },
  bookmarkBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dealBody: {
    padding: 10,
  },
  dealVendor: {
    fontSize: 10,
    fontFamily: typography.fontRegular,
    marginBottom: 2,
  },
  dealTitle: {
    fontSize: 12,
    fontFamily: typography.fontSemiBold,
    lineHeight: 16,
    height: 32, // Allow exactly 2 lines
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  starRow: {
    flexDirection: "row",
    gap: 1,
  },
  ratingText: {
    fontSize: 9,
    fontFamily: typography.fontRegular,
  },
  dealLocation: {
    fontSize: 9,
    fontFamily: typography.fontRegular,
    marginTop: 3,
  },
  dealFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  dealDiscount: {
    fontSize: 13,
    fontFamily: typography.fontBold,
  },
  miniRedeemBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniRedeemText: {
    fontSize: 10,
    fontFamily: typography.fontSemiBold,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: typography.fontRegular,
  },
  emptyContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: typography.fontSemiBold,
  },
  emptyDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  resetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    marginTop: 6,
  },
  resetBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: typography.fontMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0.5,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 10,
    alignItems: "center",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 16,
  },
  modalTopControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    position: "absolute",
    top: 4,
    zIndex: 10,
  },
  modalControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalVisualBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalEmoji: {
    fontSize: 36,
  },
  modalDiscountText: {
    fontSize: 26,
    fontFamily: typography.fontBold,
    marginTop: 12,
  },
  modalVendorName: {
    fontSize: 12,
    fontFamily: typography.fontMedium,
    marginTop: 2,
  },
  modalDealTitle: {
    fontSize: 16,
    fontFamily: typography.fontBold,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  modalDealDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 16,
  },
  modalInfoSection: {
    width: "100%",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    paddingVertical: 12,
    marginTop: 16,
  },
  modalInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  modalInfoText: {
    fontSize: 11,
    fontFamily: typography.fontRegular,
  },
  couponContainer: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 12,
    marginTop: 16,
    alignItems: "center",
    gap: 6,
  },
  couponLabel: {
    fontSize: 9,
    fontFamily: typography.fontMedium,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  couponRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 4,
  },
  couponCodeText: {
    fontSize: 16,
    fontFamily: typography.fontBold,
    letterSpacing: 1.5,
  },
  couponCopyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  couponCopyText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: typography.fontBold,
  },
  instructionsBox: {
    width: "100%",
    marginTop: 14,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    padding: 10,
    borderRadius: 8,
  },
  instructLabel: {
    fontSize: 9,
    fontFamily: typography.fontRegular,
    marginBottom: 2,
  },
  instructText: {
    fontSize: 11,
    fontFamily: typography.fontRegular,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 0.5,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 13,
    fontFamily: typography.fontMedium,
  },
  modalRedeemBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
  },
  modalRedeemText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: typography.fontBold,
  },
});
