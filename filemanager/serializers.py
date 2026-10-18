from rest_framework import serializers

from .models import Folder


class FolderSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Folder
        fields = [
            "id",
            "name",
            "owner",
            "parent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Folder name cannot be empty."
            )

        if value in {".", ".."} or "/" in value or "\\" in value:
            raise serializers.ValidationError(
                "Folder name cannot contain path separators."
            )

        return value

    def validate_parent(self, parent):
        if parent is None:
            return parent

        request = self.context.get("request")

        if request and parent.owner_id != request.user.pk:
            raise serializers.ValidationError(
                "You cannot create a folder inside another user's folder."
            )

        return parent

    def validate(self, attrs):
        request = self.context.get("request")
        name = attrs.get(
            "name",
            getattr(self.instance, "name", None),
        )
        parent = attrs.get(
            "parent",
            getattr(self.instance, "parent", None),
        )

        if self.instance and parent:
            current = parent

            while current is not None:
                if current.pk == self.instance.pk:
                    raise serializers.ValidationError({
                        "parent": "Circular folder structures are not allowed."
                    })

                current = current.parent

        if request and name:
            duplicates = Folder.objects.filter(
                owner=request.user,
                parent=parent,
                name__iexact=name,
            )

            if self.instance:
                duplicates = duplicates.exclude(pk=self.instance.pk)

            if duplicates.exists():
                raise serializers.ValidationError({
                    "name": "A folder with this name already exists here."
                })

        return attrs