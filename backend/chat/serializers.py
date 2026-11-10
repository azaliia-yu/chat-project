from rest_framework import serializers
from .models import Channel, Message


class ChannelSerializer(serializers.ModelSerializer):
    messages_count = serializers.IntegerField(
        source='messages.count', read_only=True,
    )
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description', 'is_public',
            'created_by_client_id', 'created_at',
            'messages_count', 'last_message', 'unread_count',
        ]
        read_only_fields = [
            'created_by_client_id', 'created_at', 'is_public',
        ]

    def get_last_message(self, obj):
        msg = obj.messages.order_by('-created_at').first()
        if not msg:
            return None
        return {
            'id': msg.id,
            'text': msg.text[:80],
            'file_name': msg.file_name,
            'created_at': msg.created_at,
        }

    def get_unread_count(self, obj):
        client_id = self.context.get('client_id')
        if not client_id:
            return 0
        return obj.messages.exclude(
            author_client_id=client_id,
        ).exclude(reads__client_id=client_id).count()


class MessageSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'channel',
            'author_client_id', 'author_name',
            'text', 'file', 'file_url', 'file_name', 'file_size',
            'created_at', 'updated_at',
            'is_read', 'is_mine',
        ]
        read_only_fields = [
            'author_client_id', 'author_name',
            'created_at', 'updated_at', 'file_name', 'file_size',
        ]
        extra_kwargs = {'file': {'write_only': True}}

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get('request')
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url

    def get_is_mine(self, obj):
        client_id = self.context.get('client_id')
        return bool(client_id) and obj.author_client_id == client_id

    def get_is_read(self, obj):
        client_id = self.context.get('client_id')
        if not client_id:
            return False
        if obj.author_client_id == client_id:
            return obj.reads.exclude(client_id=client_id).exists()
        return obj.reads.filter(client_id=client_id).exists()

    def validate(self, attrs):
        text = (attrs.get('text') or '').strip()
        file = attrs.get('file')
        if not text and not file:
            raise serializers.ValidationError('text or file is required')
        attrs['text'] = text
        return attrs