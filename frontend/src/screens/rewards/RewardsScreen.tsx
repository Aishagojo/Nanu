import React, { useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";

type RewardTile = {
  id: string;
  title: string;
  subtitle: string;
  cost: number;
  image: string;
  type: "merch" | "fee" | "badge" | "experience";
};

const sampleRewards: RewardTile[] = [
  {
    id: "hoodie",
    title: "Limited Hoodie",
    subtitle: "Showcase the campus pride",
    cost: 200,
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=60",
    type: "merch",
  },
  {
    id: "fee-credit",
    title: "KES 1,000 Fee Credit",
    subtitle: "Instant relief on next invoice",
    cost: 150,
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=60",
    type: "fee",
  },
  {
    id: "badge",
    title: "Streak Champion Badge",
    subtitle: "Unlocked at 3 weeks on-time",
    cost: 80,
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=60",
    type: "badge",
  },
  {
    id: "trip",
    title: "Field Trip Pass",
    subtitle: "Exclusive tourism visit",
    cost: 300,
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=60",
    type: "experience",
  },
];

export const RewardsScreen: React.FC = () => {
  const [selectedReward, setSelectedReward] = useState<RewardTile | null>(null);

  const balance = 245; // placeholder until API hookup
  const streak = 5;

  const tier = useMemo(() => {
    if (balance >= 300) return "Gold";
    if (balance >= 150) return "Silver";
    return "Bronze";
  }, [balance]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroText}>
          <Text style={styles.heroLabel}>Current Balance</Text>
          <Text style={styles.heroValue}>{balance} EDUReward</Text>
          <Text style={styles.heroTier}>Tier: {tier}</Text>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="medal" size={42} color={palette.surface} />
          <Text style={styles.heroStreak}>{streak}-day streak</Text>
        </View>
      </View>

      <View style={styles.walletCard}>
        <View>
          <Text style={styles.cardTitle}>Connect HashPack Wallet</Text>
          <Text style={styles.cardSubtitle}>
            Link your wallet to receive tokens instantly and redeem prizes.
          </Text>
        </View>
        <VoiceButton label="Connect" onPress={() => {}} />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Rewards</Text>
        <TouchableOpacity>
          <Text style={styles.sectionLink}>View all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.rewardGrid}>
        {sampleRewards.map((reward) => (
          <TouchableOpacity
            key={reward.id}
            style={styles.rewardCard}
            onPress={() => setSelectedReward(reward)}
          >
            <Image source={{ uri: reward.image }} style={styles.rewardImage} />
            <View style={styles.rewardBody}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardSubtitle}>{reward.subtitle}</Text>
              <View style={styles.rewardFooter}>
                <Text style={styles.rewardCost}>{reward.cost} tokens</Text>
                <Ionicons name="arrow-forward" size={18} color={palette.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Earn faster</Text>
      </View>
      <View style={styles.earnList}>
        <View style={styles.earnItem}>
          <Ionicons name="calendar" size={32} color={palette.primary} />
          <View style={styles.earnBody}>
            <Text style={styles.earnTitle}>Attendance streak</Text>
            <Text style={styles.earnSubtitle}>Complete every class this week.</Text>
          </View>
          <Text style={styles.earnReward}>+10</Text>
        </View>
        <View style={styles.earnItem}>
          <Ionicons name="alarm" size={32} color={palette.primary} />
          <View style={styles.earnBody}>
            <Text style={styles.earnTitle}>Early assignment</Text>
            <Text style={styles.earnSubtitle}>Submit 24h before the deadline.</Text>
          </View>
          <Text style={styles.earnReward}>+5</Text>
        </View>
        <View style={styles.earnItem}>
          <Ionicons name="share-social" size={32} color={palette.primary} />
          <View style={styles.earnBody}>
            <Text style={styles.earnTitle}>Share milestone</Text>
            <Text style={styles.earnSubtitle}>Post your pass mark to classmates.</Text>
          </View>
          <Text style={styles.earnReward}>+3</Text>
        </View>
      </View>

      {selectedReward ? (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Image source={{ uri: selectedReward.image }} style={styles.modalImage} />
            <Text style={styles.modalTitle}>{selectedReward.title}</Text>
            <Text style={styles.modalSubtitle}>{selectedReward.subtitle}</Text>
            <Text style={styles.modalCost}>{selectedReward.cost} EDUReward</Text>
            <View style={styles.modalActions}>
              <VoiceButton label="Claim" onPress={() => {}} />
              <VoiceButton label="Close" onPress={() => setSelectedReward(null)} />
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: palette.background,
    
  },
  heroCard: {
    backgroundColor: palette.primary,
    borderRadius: 24,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroText: {
    flex: 1,
  },
  heroLabel: {
    ...typography.helper,
    color: palette.surface,
  },
  heroValue: {
    ...typography.headingXL,
    color: palette.surface,
    marginTop: spacing.xs,
  },
  heroTier: {
    ...typography.body,
    color: palette.surface,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  heroBadge: {
    alignItems: "center",
  },
  heroStreak: {
    ...typography.helper,
    color: palette.surface,
    marginTop: spacing.xs,
  },
  walletCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  cardSubtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  sectionLink: {
    ...typography.helper,
    color: palette.primary,
  },
  rewardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rewardCard: {
    width: "48%",
    backgroundColor: palette.surface,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4,
    marginBottom: spacing.md,
  },
  rewardImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  rewardBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  rewardTitle: {
    ...typography.headingM,
  },
  rewardSubtitle: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  rewardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  rewardCost: {
    ...typography.helper,
    color: palette.primary,
  },
  earnList: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  earnItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  earnBody: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  earnTitle: {
    ...typography.headingM,
  },
  earnSubtitle: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  earnReward: {
    ...typography.headingM,
    color: palette.primary,
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    width: "100%",
    maxWidth: 420,
    gap: spacing.sm,
  },
  modalImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  modalTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  modalSubtitle: {
    ...typography.body,
    color: palette.textSecondary,
  },
  modalCost: {
    ...typography.headingM,
    color: palette.primary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.md,
  },
});

