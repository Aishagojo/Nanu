from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Q, Count
from django_filters.rest_framework import DjangoFilterBackend

from core.permissions import IsAdminOrLecturer, IsStudentReadOnly
from ..serializers.achievements import (
    AchievementCategorySerializer,
    AchievementSerializer,
    StudentAchievementSerializer,
    RewardClaimSerializer,
    TermProgressSerializer,
)
from ..achievement_models import (
    AchievementCategory,
    Achievement,
    StudentAchievement,
    RewardClaim,
    TermProgress
)


class AchievementCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for achievement categories.
    Only admins/lecturers can create/edit, students can view.
    """
    queryset = AchievementCategory.objects.all()
    serializer_class = AchievementCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrLecturer|IsStudentReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['name', 'description']

    def get_queryset(self):
        return self.queryset.annotate(
            achievement_count=Count('achievements')
        ).order_by('name')

    @action(detail=True, methods=['get'])
    def achievements_overview(self, request, pk=None):
        """Get overview of achievements in this category with student progress"""
        category = self.get_object()
        user = request.user
        term = request.query_params.get('term')
        
        if not term:
            return Response({'error': 'Term parameter is required'}, status=400)
            
        achievements = category.achievements.all()
        data = []
        
        for achievement in achievements:
            achievement_data = self.get_serializer(achievement).data
            if user.role == 'student':
                claims = StudentAchievement.objects.filter(
                    achievement=achievement,
                    student=user,
                    term=term
                ).count()
                achievement_data['claimed_count'] = claims
            else:
                total_claims = StudentAchievement.objects.filter(
                    achievement=achievement,
                    term=term
                ).count()
                approved_claims = StudentAchievement.objects.filter(
                    achievement=achievement,
                    term=term,
                    approved_by__isnull=False
                ).count()
                achievement_data.update({
                    'total_claims': total_claims,
                    'approved_claims': approved_claims
                })
            data.append(achievement_data)
            
        return Response(data)


class AchievementViewSet(viewsets.ModelViewSet):
    """
    API endpoint for achievements.
    Only admins/lecturers can create/edit, students can view.
    """
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminOrLecturer|IsStudentReadOnly]
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ['category', 'requires_approval', 'max_claims_per_term']
    search_fields = ['name', 'description', 'voice_message']

    @action(detail=True, methods=['get'])
    def student_progress(self, request, pk=None):
        """Get student progress for this achievement"""
        achievement = self.get_object()
        term = request.query_params.get('term')
        if not term:
            return Response({'error': 'Term parameter is required'}, status=400)

        claims = StudentAchievement.objects.filter(
            achievement=achievement,
            term=term
        ).values('student__username', 'student__display_name').annotate(
            total_points=Count('points_earned')
        )
        return Response(claims)

    @action(detail=True, methods=['get'])
    def available_for_student(self, request, pk=None):
        """Check if student can claim this achievement"""
        achievement = self.get_object()
        user = request.user
        term = request.query_params.get('term')
        
        if not term or user.role != 'student':
            return Response({'error': 'Invalid request'}, status=400)
            
        current_claims = StudentAchievement.objects.filter(
            achievement=achievement,
            student=user,
            term=term
        ).count()
        
        can_claim = current_claims < achievement.max_claims_per_term if achievement.max_claims_per_term else True
        prerequisites_met = True
        
        # Check prerequisites if any
        if achievement.prerequisites.exists():
            for prereq in achievement.prerequisites.all():
                if not StudentAchievement.objects.filter(
                    achievement=prereq,
                    student=user,
                    approved_by__isnull=False
                ).exists():
                    prerequisites_met = False
                    break
                    
        return Response({
            'can_claim': can_claim and prerequisites_met,
            'current_claims': current_claims,
            'max_claims': achievement.max_claims_per_term,
            'prerequisites_met': prerequisites_met
        })


class StudentAchievementViewSet(viewsets.ModelViewSet):
    """
    API endpoint for student achievements.
    Students can create claims, lecturers can approve.
    """
    serializer_class = StudentAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'achievement', 'term', 'approved_by']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return StudentAchievement.objects.filter(student=user)
        elif user.role in ['lecturer', 'admin']:
            return StudentAchievement.objects.all()
        return StudentAchievement.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role == 'student':
            serializer.save(student=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a student achievement claim"""
        if request.user.role not in ['lecturer', 'admin']:
            return Response({'error': 'Only lecturers can approve achievements'},
                          status=403)

        achievement = self.get_object()
        if achievement.approved_by:
            return Response({'error': 'Achievement already approved'},
                          status=400)

        achievement.approved_by = request.user
        achievement.approved_at = timezone.now()
        achievement.save()

        # Update term progress
        TermProgress.objects.get_or_create(
            student=achievement.student,
            term=achievement.term,
        )

        return Response(self.get_serializer(achievement).data)
        
    @action(detail=True, methods=['post'])
    def bulk_approve(self, request, pk=None):
        """Bulk approve achievements for multiple students"""
        if request.user.role not in ['lecturer', 'admin']:
            return Response({'error': 'Only lecturers can approve achievements'},
                          status=403)
            
        achievement = self.get_object()
        student_ids = request.data.get('student_ids', [])
        term = request.data.get('term')
        
        if not student_ids or not term:
            return Response({'error': 'Student IDs and term are required'},
                          status=400)
                          
        # Get all unapproved claims for these students
        claims = StudentAchievement.objects.filter(
            achievement=achievement,
            student_id__in=student_ids,
            term=term,
            approved_by__isnull=True
        )
        
        # Bulk update claims
        updated_count = claims.update(
            approved_by=request.user,
            approved_at=timezone.now()
        )
        
        return Response({
            'message': f'Approved {updated_count} achievement claims',
            'updated_count': updated_count
        })


class RewardClaimViewSet(viewsets.ModelViewSet):
    """
    API endpoint for reward claims.
    Students can create claims, lecturers can approve.
    """
    serializer_class = RewardClaimSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'term', 'approved_by']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return RewardClaim.objects.filter(student=user)
        return RewardClaim.objects.none()

    def perform_create(self, serializer):
        if self.request.user.role != 'student':
            return Response({'error': 'Only students can claim rewards'}, status=403)
        serializer.save(student=self.request.user)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a reward claim"""
        if request.user.role not in ['lecturer', 'admin']:
            return Response({'error': 'Only lecturers can approve rewards'},
                          status=403)

        claim = self.get_object()
        if claim.approved_by:
            return Response({'error': 'Reward already approved'},
                          status=400)

        claim.approved_by = request.user
        claim.approved_at = timezone.now()
        claim.save()

        return Response(self.get_serializer(claim).data)


class TermProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for term progress tracking.
    Read-only as it's automatically updated by achievements/rewards.
    """
    serializer_class = TermProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['student', 'term']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return TermProgress.objects.filter(student=user)
        elif user.role in ['lecturer', 'admin']:
            return TermProgress.objects.all()
        return TermProgress.objects.none()

    @action(detail=False, methods=['get'])
    def current_term(self, request):
        """Get progress for the current term"""
        user = request.user
        if user.role != 'student':
            return Response({'error': 'Only available for students'},
                          status=403)

        term = request.query_params.get('term')
        if not term:
            return Response({'error': 'Term parameter is required'},
                          status=400)

        progress = TermProgress.objects.filter(
            student=user,
            term=term
        ).first()

        if not progress:
            return Response({'error': 'No progress found for current term'},
                          status=404)

        # Include additional achievement statistics
        data = self.get_serializer(progress).data
        
        # Get achievement stats
        achievements_stats = StudentAchievement.objects.filter(
            student=user,
            term=term
        ).aggregate(
            total_claims=Count('id'),
            approved_claims=Count('id', filter=Q(approved_by__isnull=False)),
            total_points=Count('points_earned')
        )
        
        # Get reward stats
        rewards_stats = RewardClaim.objects.filter(
            student=user,
            term=term
        ).aggregate(
            claimed_rewards=Count('id'),
            approved_rewards=Count('id', filter=Q(approved_by__isnull=False))
        )
        
        data.update({
            'achievements_stats': achievements_stats,
            'rewards_stats': rewards_stats
        })

        return Response(data)
        
    @action(detail=False, methods=['get'])
    def leaderboard(self, request):
        """Get term leaderboard based on achievements and points"""
        term = request.query_params.get('term')
        if not term:
            return Response({'error': 'Term parameter is required'}, status=400)
            
        leaderboard = TermProgress.objects.filter(term=term).select_related('student')
        
        # Annotate with achievement counts and total points
        leaderboard = leaderboard.annotate(
            total_achievements=Count('student__achievements', 
                                  filter=Q(student__achievements__approved_by__isnull=False)),
            total_points=Count('student__achievements__points_earned')
        ).order_by('-total_points', '-total_achievements')[:10]
        
        data = []
        for entry in leaderboard:
            data.append({
                'student_name': entry.student.display_name,
                'total_achievements': entry.total_achievements,
                'total_points': entry.total_points,
                # Use annotated achievements as badges earned to avoid relying on undeclared fields
                'badges_earned': entry.total_achievements,
                # Fall back to model field maintained by the system
                'rewards_claimed': getattr(entry, 'rewards_claimed_count', 0),
            })
            
        return Response(data)
