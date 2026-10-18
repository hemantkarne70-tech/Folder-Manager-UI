
from pathlib import Path

from rest_framework import serializers

from .models import Folder, ManagedFile


MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


class ManagedFileSerializer(serializers.ModelSerializer):
    folder = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.all(),
        required=False,
        allow_null=True,
    )

    download_url = serializers.SerializerMethodField()

    class Meta:
        model = ManagedFile
        fields = [
            "id",
            "name",
            "folder",
            "size",
            "content_type",
            "created_at",
            "updated_at",
            "download_url",
        ]
        read_only_fields = [
            "id",
            "size",
            "content_type",
            "created_at",
            "updated_at",
            "download_url",
        ]

    def get_download_url(self, obj):
        request = self.context.get("request")
        path = f"/api/files/{obj.pk}/download/"

        return request.build_absolute_uri(path) if request else path

    def validate_folder(self, folder):
        request = self.context.get("request")

        if folder and request and folder.owner_id != request.user.id:
            raise serializers.ValidationError(
                "You cannot upload files into another user's folder."
            )

        return folder

    def validate_name(self, value):
        name = Path(value.replace("\\", "/")).name.strip()

        if not name or name in {".", ".."}:
            raise serializers.ValidationError("Invalid filename.")

        if len(name) > 255:
            raise serializers.ValidationError("Filename is too long.")

        return name

    def validate(self, attrs):
        uploaded = self.context.get("uploaded_file")

        if uploaded is None:
            raise serializers.ValidationError({
                "file": "Please select a file to upload."
            })

        if uploaded.size > MAX_FILE_SIZE:
            raise serializers.ValidationError({
                "file": "Maximum file size is 25 MB."
            })

        return attrs

    def create(self, validated_data):
        uploaded = self.context["uploaded_file"]
        request = self.context["request"]
        name = validated_data.pop("name")

        return ManagedFile.objects.create(
            owner=request.user,
            name=name,
            size=uploaded.size,
            content_type=uploaded.content_type or "",
            file=uploaded,
            **validated_data,
        )
