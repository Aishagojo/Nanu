from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend

from .models import LibraryAsset
from .serializers import LibraryAssetSerializer


class LibraryAssetViewSet(viewsets.ModelViewSet):
    queryset = LibraryAsset.objects.all()
    serializer_class = LibraryAssetSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['programme', 'unit', 'type', 'tags']