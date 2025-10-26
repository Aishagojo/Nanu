import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette, spacing, typography } from "@theme/index";
import { VoiceButton } from "@components/index";

const MAX_CLAIMS_PER_TERM = 3;
const REWARD_POINT_TARGET = 300;

type RewardTile = {
  id: string;
  title: string;
  subtitle: string;
  cost: number;
  image: string;
  type: "merch" | "fee" | "badge" | "experience";
};

type RewardAction = {
  id: string;
  title: string;
  description: string;
  points: number;
  icon: keyof typeof Ionicons.glyphMap;
};

const rewardActions: RewardAction[] = [
  { id: "attendance", title: "On-time attendance", description: "Mark present within 5 minutes.", points: 15, icon: "calendar" },
  { id: "assignment", title: "Early assignment", description: "Submit work a day early.", points: 10, icon: "alarm" },
  { id: "participation", title: "Class participation", description: "Share a helpful tip in class chat.", points: 6, icon: "chatbubble" },
  { id: "community", title: "Community helper", description: "Assist a peer or share resources.", points: 8, icon: "people" },
];

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
  const [tokenBalance, setTokenBalance] = useState(240);
  const [lifetimePoints, setLifetimePoints] = useState(180);
  const [termClaimsUsed, setTermClaimsUsed] = useState(0);
  const [actionFeed, setActionFeed] = useState<Array<{ id: string; title: string; points: number; timestamp: number }>>([]);

  const streak = 5;

  const tier = useMemo(() => {
    if (tokenBalance >= 450) return "Platinum";
    if (tokenBalance >= 300) return "Gold";
    if (tokenBalance >= 150) return "Silver";
    return "Bronze";
  }, [tokenBalance]);

  const progressPoints = lifetimePoints % REWARD_POINT_TARGET;
  const progressPercent = Math.min(Math.round((progressPoints / REWARD_POINT_TARGET) * 100), 100);
  const claimsUnlocked = Math.floor(lifetimePoints / REWARD_POINT_TARGET);
  const claimsRemaining = Math.max(MAX_CLAIMS_PER_TERM - termClaimsUsed, 0);
  const claimsAvailable = Math.max(Math.min(claimsUnlocked - termClaimsUsed, claimsRemaining), 0);
  const canRedeemNow = claimsAvailable > 0;

  const logAction = useCallback((action: RewardAction) => {
    setLifetimePoints((prev) => prev + action.points);
    setTokenBalance((prev) => prev + action.points);
    setActionFeed((prev) => [{ id: `${action.id}-${Date.now()}`, title: action.title, points: action.points, timestamp: Date.now() }, ...prev].slice(0, 4));
  }, []);

  const handleRewardClaim = useCallback(() => {
    if (!selectedReward) return;
    if (termClaimsUsed >= MAX_CLAIMS_PER_TERM) {
      Alert.alert("Limit reached", "Reward claims reopen next term.");
      return;
    }
    if (!canRedeemNow) {
      Alert.alert("Keep earning", "Fill the progress bar to unlock a reward slot.");
      return;
    }
    if (tokenBalance < selectedReward.cost) {
      Alert.alert("Not enough points", "Log more actions to reach this reward cost.");
      return;
    }
    setTokenBalance((prev) => prev - selectedReward.cost);
    setTermClaimsUsed((prev) => prev + 1);
    setSelectedReward(null);
    Alert.alert("Reward claimed", "Finance will validate and schedule the delivery.");
  }, [selectedReward, canRedeemNow, tokenBalance, termClaimsUsed]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroText}>
          <Text style={styles.heroLabel}>Current Balance</Text>
          <Text style={styles.heroValue}>{tokenBalance} EDUReward</Text>
          <Text style={styles.heroTier}>Tier: {tier}</Text>
        </View>
        <View style={styles.heroBadge}>
          <Ionicons name="medal" size={42} color={palette.surface} />
          <Text style={styles.heroStreak}>{streak}-day streak</Text>
        </View>
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.cardTitle}>Term reward tracker</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressMeta}>{progressPoints} / {REWARD_POINT_TARGET} pts toward the next slot</Text>
        <View style={styles.claimRow}>
          {Array.from({ length: MAX_CLAIMS_PER_TERM }).map((_, index) => (
            <View
              key={index}
              style={[styles.claimDot, index < termClaimsUsed ? styles.claimDotUsed : undefined]}
            />
          ))}
          <Text style={styles.claimText}>Claims left this term: {claimsRemaining}</Text>
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
        <Text style={styles.sectionTitle}>Log actions</Text>
        <Text style={styles.sectionLink}>Each action awards fixed points</Text>
      </View>
      <View style={styles.actionList}>
        {rewardActions.map((action) => (
          <View key={action.id} style={styles.actionCard}>
            <View style={styles.actionIcon}>
              <Ionicons name={action.icon} size={24} color={palette.primary} />
            </View>
            <View style={styles.actionBody}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.description}</Text>
            </View>
            <VoiceButton label={`+${action.points}`} onPress={() => logAction(action)} />
          </View>
        ))}
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
                <Text style={styles.rewardCost}>{reward.cost} pts</Text>
                <Ionicons name="arrow-forward" size={18} color={palette.primary} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent actions</Text>
      </View>
      <View style={styles.feedCard}>
        {actionFeed.length === 0 ? (
          <Text style={styles.helperText}>Log an action to start filling the bar.</Text>
        ) : (
          actionFeed.map((item) => (
            <View key={item.id} style={styles.feedRow}>
              <Text style={styles.feedTitle}>{item.title}</Text>
              <Text style={styles.feedPoints}>+{item.points} pts</Text>
            </View>
          ))
        )}
      </View>

      {selectedReward ? (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Image source={{ uri: selectedReward.image }} style={styles.modalImage} />
            <Text style={styles.modalTitle}>{selectedReward.title}</Text>
            <Text style={styles.modalSubtitle}>{selectedReward.subtitle}</Text>
            <Text style={styles.modalCost}>{selectedReward.cost} EDUReward</Text>
            <View style={styles.modalActions}>
              <VoiceButton label="Claim" onPress={handleRewardClaim} accessibilityHint="Use an unlocked reward slot" />
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
    marginBottom: spacing.md,
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
  progressCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    marginBottom: spacing.lg,
  },
  progressTrack: {
    width: "100%",
    height: 16,
    borderRadius: 999,
    backgroundColor: palette.disabled,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.accent,
  },
  progressMeta: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  claimRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  claimDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  claimDotUsed: {
    backgroundColor: palette.primary,
  },
  claimText: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  walletCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  cardSubtitle: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  sectionLink: {
    ...typography.helper,
    color: palette.primary,
  },
  actionList: {
    gap: spacing.md,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.background,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBody: {
    flex: 1,
  },
  actionTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  actionSubtitle: {
    ...typography.helper,
    color: palette.textSecondary,
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
  feedCard: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  feedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedTitle: {
    ...typography.body,
    color: palette.textPrimary,
  },
  feedPoints: {
    ...typography.helper,
    color: palette.accent,
  },
  helperText: {
    ...typography.helper,
    color: palette.textSecondary,
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
