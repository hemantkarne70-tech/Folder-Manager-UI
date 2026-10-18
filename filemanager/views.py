from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from .models import Folder
from .serializers import FolderSerializer


class FolderViewSet(viewsets.ModelViewSet):
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Folder.objects.filter(
            owner=self.request.user
        ).select_related("owner", "parent")

        # Optional filter: ?parent=3
        parent_id = self.request.query_params.get("parent")

        if parent_id is not None:
            if parent_id == "null":
                return queryset.filter(parent__isnull=True)

            try:
                parent_id = int(parent_id)
            except (TypeError, ValueError):
                raise ValidationError({
                    "parent": "Provide a valid folder ID or 'null'."
                })

            return queryset.filter(parent_id=parent_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)