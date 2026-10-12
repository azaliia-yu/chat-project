from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import Channel, Message
from .serializers import ChannelSerializer, MessageSerializer


class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        channel = self.get_object()
        msgs = channel.messages.all()
        serializer = MessageSerializer(msgs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        channel = self.get_object()
        text = request.data.get('text', '').strip()
        if not text:
            return Response(
                {'error': 'text is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = request.user if request.user.is_authenticated else None
        message = Message.objects.create(
            channel=channel,
            author=user,
            text=text,
        )
        return Response(
            MessageSerializer(message).data,
            status=status.HTTP_201_CREATED,
        )


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.select_related('channel', 'author').all()
    serializer_class = MessageSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(author=user)