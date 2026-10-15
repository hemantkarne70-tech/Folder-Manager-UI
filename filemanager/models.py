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

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class ManagedFile(models.Model):
    name = models.CharField(max_length=255)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="managed_files",
    )

    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name="files",
    )

    file = models.FileField(upload_to="uploads/%Y/%m/")

    size = models.PositiveBigIntegerField(default=0)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name
    
