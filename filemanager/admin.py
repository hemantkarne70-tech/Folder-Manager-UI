from django.contrib import admin
from .models import Folder, ManagedFile


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "parent", "created_at")
    search_fields = ("name", "owner__username")
    list_filter = ("created_at",)


@admin.register(ManagedFile)
class ManagedFileAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "folder", "size", "created_at")
    search_fields = ("name", "owner__username")
    list_filter = ("content_type", "created_at")