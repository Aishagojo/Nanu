from rest_framework import serializers

from .models import LibraryAsset, ResourceTag


class ResourceTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceTag
        fields = "__all__"


class LibraryAssetSerializer(serializers.ModelSerializer):
    tags = ResourceTagSerializer(many=True, read_only=True)

    class Meta:
        model = LibraryAsset
        fields = "__all__"