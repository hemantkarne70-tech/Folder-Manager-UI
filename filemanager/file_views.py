from pathlib import Path
from datetime import timedelta

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone

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

        # Trash is a separate view. Normal file requests never include trashed files.
        if self.request.query_params.get("trashed", "false").lower() == "true":
            return queryset.filter(is_trashed=True).order_by("-deleted_at", "-created_at")

        queryset = queryset.filter(is_trashed=False)
        folder_id = self.request.query_params.get("folder")
        if folder_id == "null":
            return queryset.filter(folder__isnull=True)
        if folder_id is not None:
            return queryset.filter(folder_id=folder_id)
        return queryset

    def create(self, request, *args, **kwargs):
        uploaded = request.FILES.get("file")
        if uploaded is None:
            raise ValidationError({"file": "Send a file using multipart/form-data."})

        folder_id = request.data.get("folder")
        if folder_id not in (None, "", "null"):
            folder = get_object_or_404(Folder, pk=folder_id, owner=request.user)
        else:
            folder = None

        serializer = self.get_serializer(
            data={"name": Path(uploaded.name.replace("\\", "/")).name, "folder": folder.pk if folder else None},
            context={**self.get_serializer_context(), "uploaded_file": uploaded},
        )
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            instance = serializer.save()
        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        obj = self.get_object()
        if obj.is_trashed:
            return Response({"detail": "Restore this file before downloading it."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            file_handle = obj.file.open("rb")
        except (OSError, ValueError):
            return Response({"detail": "The stored file is unavailable."}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(file_handle, as_attachment=True, filename=obj.name)
        response["X-Content-Type-Options"] = "nosniff"
        return response

    @action(detail=True, methods=["patch"], url_path="move")
    def move(self, request, pk=None):
        obj = self.get_object()
        folder_id = request.data.get("folder")
        if folder_id in (None, "", "null"):
            obj.folder = None
        else:
            obj.folder = get_object_or_404(Folder, pk=folder_id, owner=request.user)
        obj.save(update_fields=["folder", "updated_at"])
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        # DELETE /files/{id}/ moves a file to Trash instead of removing the bytes.
        instance.is_trashed = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_trashed", "deleted_at", "updated_at"])

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, pk=None):
        obj = get_object_or_404(ManagedFile, pk=pk, owner=request.user, is_trashed=True)
        # Keep obj.folder as the original folder. If it was deleted, restore to root.
        if obj.folder_id and not Folder.objects.filter(pk=obj.folder_id, owner=request.user).exists():
            obj.folder = None
        obj.is_trashed = False
        obj.deleted_at = None
        obj.save(update_fields=["folder", "is_trashed", "deleted_at", "updated_at"])
        return Response(self.get_serializer(obj).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["delete"], url_path="permanent-delete")
    def permanent_delete(self, request, pk=None):
        obj = get_object_or_404(ManagedFile, pk=pk, owner=request.user, is_trashed=True)
        stored_file = obj.file
        with transaction.atomic():
            obj.delete()
            transaction.on_commit(lambda: stored_file.delete(save=False))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="storage-summary")
    def storage_summary(self, request):
        # Include trashed records: their bytes still occupy storage until permanent deletion.
        from django.db.models import Sum
        summary = ManagedFile.objects.filter(owner=request.user).aggregate(total=Sum("size"))
        return Response({"used_bytes": summary["total"] or 0}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["delete"], url_path="empty-trash")
    def empty_trash(self, request):
        trashed = ManagedFile.objects.filter(owner=request.user, is_trashed=True)
        count = trashed.count()
        for obj in trashed.iterator():
            stored_file = obj.file
            with transaction.atomic():
                obj.delete()
                transaction.on_commit(lambda stored_file=stored_file: stored_file.delete(save=False))
        return Response({"deleted": count}, status=status.HTTP_200_OK)
