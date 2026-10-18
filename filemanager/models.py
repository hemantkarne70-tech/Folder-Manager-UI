import os
import re
from django.conf import settings
from django.db import models


class Folder(models.Model):
    name = models.CharField(max_length=255)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="managed_folders",
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="subfolders",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name


def safe_path_name(value):
    """Convert a folder or filename component into a safe path name."""
    value = str(value or "").strip()
    value = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", value)
    value = value.rstrip(". ")
    return value[:150] or "Untitled"


def managed_file_upload_path(instance, filename):
    """
    Store files using actual folder names and preserve nested folders.

    Example:
    media/user_1/Documents/Projects/report.pdf
    """
    owner_part = f"user_{instance.owner_id}"
    original_filename = safe_path_name(filename)

    folder_parts = []

    current = instance.folder
    while current is not None:
        folder_parts.append(safe_path_name(current.name))
        current = current.parent

    # Reverse the hierarchy: parent folder first, child folder last.
    folder_parts.reverse()

    if not folder_parts:
        folder_parts = ["Root"]

    return "/".join([owner_part, *folder_parts, original_filename])


class ManagedFile(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="managed_files",
    )

    folder = models.ForeignKey(
        "filemanager.Folder",
        on_delete=models.CASCADE,
        related_name="files",
        null=True,
        blank=True,
    )

    name = models.CharField(max_length=255)
    file = models.FileField(upload_to=managed_file_upload_path)
    size = models.PositiveBigIntegerField(default=0)
    content_type = models.CharField(max_length=150, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["owner", "folder"]),
            models.Index(fields=["owner", "name"]),
        ]

    def __str__(self):
        return self.name
    
