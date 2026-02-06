import {
  AppColors,
  Layout,
  shadowStyle,
  shadowStyleSmall,
  Spacing,
  Typography,
} from "@/constants/design";
import { useHomeData } from "@/hooks/use-home-data";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ── Home Screen ──────────────────────────────────────────────────────

export default function HomeScreen() {
  const { stats, nounCount, streak, isLoading } = useHomeData();

  const isFirstTime = stats.total_reviews === 0;
  const accuracyText = stats.success_rate != null
    ? `${Math.round(stats.success_rate)}%`
    : "--";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Üben</Text>
          <Text style={styles.headerSubtitle}>GERMAN ARTICLE PRACTICE</Text>
        </View>

        {/* ── Stats Row ───────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard
            value={isLoading ? "-" : String(stats.due_today)}
            label="DUE TODAY"
            accentColor={stats.due_today > 0
              ? AppColors.blue
              : AppColors.lightGray}
          />
          <StatCard
            value={isLoading ? "-" : String(streak)}
            label="STREAK"
            accentColor={streak > 0 ? AppColors.yellow : AppColors.lightGray}
          />
          <StatCard
            value={isLoading ? "-" : accuracyText}
            label="ACCURACY"
            accentColor={stats.success_rate != null
              ? AppColors.green
              : AppColors.lightGray}
          />
        </View>

        {/* ── CTA Button ──────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            pressed && styles.ctaButtonPressed,
          ]}
          onPress={() => router.push("/quiz")}
          accessibilityRole="button"
          accessibilityLabel={isFirstTime
            ? "Learn your first words"
            : "Start practice"}
        >
          <Text style={styles.ctaText}>
            {isFirstTime ? "LEARN YOUR FIRST WORDS" : "START PRACTICE"}
          </Text>
        </Pressable>
        <Text style={styles.ctaSubtext}>
          {isLoading
            ? " "
            : isFirstTime
            ? `${nounCount} nouns ready to learn`
            : `${stats.due_today} card${
              stats.due_today === 1 ? "" : "s"
            } waiting for review`}
        </Text>

        {/* ── Progress Card ───────────────────────────────────── */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>PROGRESS</Text>
            <Text style={styles.progressCount}>
              {stats.total_cards} of {nounCount} words
            </Text>
          </View>
          <View style={styles.progressBarOuter}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: nounCount > 0
                    ? `${Math.round((stats.total_cards / nounCount) * 100)}%`
                    : "0%",
                },
              ]}
            />
          </View>
          <Text style={styles.progressSubtext}>
            {isFirstTime
              ? "Start practicing to track your progress"
              : `${stats.total_reviews} total reviews completed`}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stat Card Component ──────────────────────────────────────────────

interface StatCardProps {
  value: string;
  label: string;
  accentColor: string;
}

function StatCard({ value, label, accentColor }: StatCardProps) {
  return (
    <View style={[styles.statCard, shadowStyleSmall]}>
      <View style={[styles.statAccent, { backgroundColor: accentColor }]} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppColors.cream,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.xxl,
  },

  // Header
  header: {
    borderBottomWidth: Layout.borderWidth,
    borderBottomColor: AppColors.black,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.huge,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  statAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  statValue: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.tiny,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
    textAlign: "center",
    letterSpacing: 1,
    marginTop: Spacing.xs,
  },

  // CTA Button
  ctaButton: {
    backgroundColor: AppColors.yellow,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
    ...shadowStyle,
  },
  ctaButtonPressed: {
    transform: [{ translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
  },
  ctaText: {
    fontSize: Typography.heading,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1,
  },
  ctaSubtext: {
    fontSize: Typography.small,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },

  // Progress Card
  progressCard: {
    backgroundColor: AppColors.white,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    padding: Layout.cardPadding,
    ...shadowStyle,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontSize: Typography.small,
    fontWeight: Typography.bold,
    color: AppColors.black,
    letterSpacing: 1.5,
  },
  progressCount: {
    fontSize: Typography.small,
    fontWeight: Typography.semibold,
    color: AppColors.textSecondary,
  },
  progressBarOuter: {
    height: 24,
    backgroundColor: AppColors.lightGray,
    borderWidth: Layout.borderWidth,
    borderColor: AppColors.black,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: AppColors.green,
    borderRightWidth: Layout.borderWidth,
    borderRightColor: AppColors.black,
    minWidth: 0,
  },
  progressSubtext: {
    fontSize: Typography.tiny,
    fontWeight: Typography.regular,
    color: AppColors.textSecondary,
    marginTop: Spacing.sm,
  },
});
