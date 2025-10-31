from rest_framework import serializers
from django.utils import timezone
from ..achievement_models import (
    AchievementCategory,
    Achievement,
    StudentAchievement,
    RewardClaim,
    TermProgress
)


class AchievementCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AchievementCategory
        fields = ['id', 'name', 'description', 'icon', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AchievementSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Achievement
        fields = [
            'id', 'category', 'category_name', 'name', 'description', 'icon',
            'points', 'max_claims_per_term', 'requires_approval',
            'auto_approve_conditions', 'voice_message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_auto_approve_conditions(self, value):
        """Validate that auto-approve conditions are in the correct format"""
        if value:
            required_keys = {'type', 'threshold'}
            if not all(key in value for key in required_keys):
                raise serializers.ValidationError(
                    "auto_approve_conditions must contain 'type' and 'threshold'"
                )
        return value


class StudentAchievementSerializer(serializers.ModelSerializer):
    achievement_name = serializers.CharField(source='achievement.name', read_only=True)
    achievement_icon = serializers.CharField(source='achievement.icon', read_only=True)
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    approver_name = serializers.CharField(source='approved_by.display_name', read_only=True)
    
    class Meta:
        model = StudentAchievement
        fields = [
            'id', 'student', 'student_name', 'achievement', 'achievement_name',
            'achievement_icon', 'points_earned', 'approved_by', 'approver_name',
            'approved_at', 'term', 'evidence', 'voice_feedback',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'approved_by', 'approved_at']

    def validate(self, data):
        """Ensure points_earned doesn't exceed achievement's points"""
        achievement = data.get('achievement')
        points_earned = data.get('points_earned')
        
        if achievement and points_earned and points_earned > achievement.points:
            raise serializers.ValidationError({
                'points_earned': f'Cannot earn more than {achievement.points} points for this achievement'
            })
        return data


class RewardClaimSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    approver_name = serializers.CharField(source='approved_by.display_name', read_only=True)
    available_points = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = RewardClaim
        fields = [
            'id', 'student', 'student_name', 'points_spent', 'reward_description',
            'approved_by', 'approver_name', 'approved_at', 'term',
            'voice_confirmation', 'available_points', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'approved_by', 'approved_at']

    def validate_points_spent(self, value):
        """Ensure student has enough points to claim reward"""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required")
            
        term = self.initial_data.get('term')
        if not term:
            raise serializers.ValidationError("Term is required")
            
        progress = TermProgress.objects.filter(
            student=request.user,
            term=term
        ).first()
        
        if not progress or progress.available_points < value:
            raise serializers.ValidationError(
                f"Not enough points available. Current balance: {progress.available_points if progress else 0}"
            )
        return value


class TermProgressSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.display_name', read_only=True)
    available_points = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = TermProgress
        fields = [
            'id', 'student', 'student_name', 'term', 'total_points_earned',
            'total_points_spent', 'rewards_claimed_count', 'available_points',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'total_points_earned',
            'total_points_spent', 'rewards_claimed_count'
        ]