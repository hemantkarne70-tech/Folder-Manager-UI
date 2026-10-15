from django.contrib import admin

from .models import Folder, ManagedFile


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "parent", "created_at")
    search_fields = ("name",)


@admin.register(ManagedFile)
class ManagedFileAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "folder", "size", "uploaded_at")
    search_fields = ("name",)