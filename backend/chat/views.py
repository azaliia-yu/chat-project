from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Channel, Message, MessageRead
from .serializers import ChannelSerializer, MessageSerializer


def get_client_id(request):
    return (request.headers.get('X-Client-Id') or '').strip()[:64]


class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.filter(is_public=True)
    serializer_class = ChannelSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        return {
            'request': self.request,
            'client_id': get_client_id(self.request),
        }

    def perform_create(self, serializer):
        serializer.save(
            created_by_client_id=get_client_id(self.request),
            is_public=True,
        )

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        channel = self.get_object()
        msgs = channel.messages.prefetch_related('reads').all()
        serializer = MessageSerializer(
            msgs, many=True, context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    @action(
        detail=True, methods=['post'],
        parser_classes=[MultiPartParser, FormParser, JSONParser],
    )
    def send_message(self, request, pk=None):
        channel = self.get_object()
        text = (request.data.get('text') or '').strip()
        upload = request.FILES.get('file')
        author_name = (request.data.get('author_name') or '').strip()[:100]

        if not text and not upload:
            return Response(
                {'error': 'text or file is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = Message(
            channel=channel,
            author_client_id=get_client_id(request),
            author_name=author_name,
            text=text,
        )
        if upload:
            message.file = upload
            message.file_name = upload.name
            message.file_size = upload.size
        message.save()

        return Response(
            MessageSerializer(
                message, context=self.get_serializer_context(),
            ).data,
            status=status.HTTP_201_CREATED,
        )


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.prefetch_related('reads').all()
    serializer_class = MessageSerializer
    permission_classes = [AllowAny]

    def get_serializer_context(self):
        return {
            'request': self.request,
            'client_id': get_client_id(self.request),
        }

    def perform_create(self, serializer):
        serializer.save(author_client_id=get_client_id(self.request))

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        client_id = get_client_id(request)
        if not client_id:
            return Response(
                {'error': 'X-Client-Id header required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        MessageRead.objects.get_or_create(
            message=message, client_id=client_id,
        )
        return Response({'status': 'ok'})

    @action(detail=False, methods=['post'])
    def mark_channel_read(self, request):
        channel_id = request.data.get('channel')
        client_id = get_client_id(request)
        if not client_id:
            return Response(
                {'error': 'X-Client-Id header required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not channel_id:
            return Response(
                {'error': 'channel is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        msgs = Message.objects.filter(
            channel_id=channel_id,
        ).exclude(author_client_id=client_id)
        objs = [MessageRead(message=m, client_id=client_id) for m in msgs]
        MessageRead.objects.bulk_create(objs, ignore_conflicts=True)
        return Response({'marked': len(objs)})