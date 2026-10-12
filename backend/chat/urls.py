from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ChannelViewSet, MessageViewSet

router = DefaultRouter()
router.register(r'channels', ChannelViewSet, basename='channel')
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
]