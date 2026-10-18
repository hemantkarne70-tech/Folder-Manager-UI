from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FolderViewSet
from .file_views import ManagedFileViewSet

router = DefaultRouter()
router.register("folders", FolderViewSet, basename="folder")
router.register("files", ManagedFileViewSet, basename="file")

urlpatterns = [
    path("", include(router.urls)),
]