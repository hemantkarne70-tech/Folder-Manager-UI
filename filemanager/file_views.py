
from pathlib import Path

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.db import transaction

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Folder, ManagedFile
from .file_serializers import ManagedFileSerializer


class ManagedFileViewSet(viewsets.ModelViewSet):
    serializer_class = ManagedFileSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = ManagedFile.objects.filter(
            owner=self.request.user
        ).select_related("folder")

        folder_id = self.request.query_params.get("folder")

        if folder_id == "null":
            return queryset.filter(folder__isnull=True)

        if folder_id is not None:
            return queryset.filter(folder_id=folder_id)

        return queryset

    def create(self, request, *args, **kwargs):
        uploaded = request.FILES.get("file")

        if uploaded is None:
            raise ValidationError({
                "file": "Send a file using multipart/form-data."
            })

        folder_id = request.data.get("folder")

        if folder_id not in (None, "", "null"):
            folder = get_object_or_404(
                Folder,
                pk=folder_id,
                owner=request.user,
            )
        else:
            folder = None

        serializer = self.get_serializer(
            data={
                "name": Path(uploaded.name.replace("\\", "/")).name,
                "folder": folder.pk if folder else None,
            },
            context={
                **self.get_serializer_context(),
                "uploaded_file": uploaded,
            },
        )

        # Attach the actual uploaded file to serializer input.
        serializer.is_valid(raise_exception=True)

        # Save the file and metadata as one operation.
        with transaction.atomic():
            instance = serializer.save()

        return Response(
            self.get_serializer(instance).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        obj = self.get_object()

        try:
            file_handle = obj.file.open("rb")
        except (OSError, ValueError):
            return Response(
                {"detail": "The stored file is unavailable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        response = FileResponse(
            file_handle,
            as_attachment=True,
            filename=obj.name,
        )
        response["X-Content-Type-Options"] = "nosniff"
        return response
    
    @action(detail=True, methods=["patch"], url_path="move")
    def move(self, request, pk=None):
        obj = self.get_object()

        folder_id = request.data.get("folder")

        if folder_id in ("", None):
            obj.folder = None
        else:
            # Validate that the destination folder belongs to this user.
            folder = Folder.objects.get(
                id=folder_id,
                owner=request.user
            )
            obj.folder = folder

        obj.save(update_fields=["folder"])

        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        stored_file = instance.file

        with transaction.atomic():
            instance.delete()
            transaction.on_commit(
                lambda: stored_file.delete(save=False)
            )
            
    @action(detail=True, methods=["patch"], url_path="move")
    def move(self, request, pk=None):
        obj = self.get_object()

        folder_id = request.data.get("folder")

        if folder_id in (None, "", "null"):
            obj.folder = None
        else:
            folder = get_object_or_404(
                Folder,
                pk=folder_id,
                owner=request.user,
            )
            obj.folder = folder

        obj.save(update_fields=["folder", "updated_at"])

        serializer = self.get_serializer(obj)
        return Response(serializer.data)
