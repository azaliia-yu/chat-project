from rest_framework import serializers

from .models import Channel, Message


class ChannelSerializer(serializers.ModelSerializer):
    """Канал + количество сообщений + последнее сообщение."""
    messages_count = serializers.IntegerField(
        source='messages.count', read_only=True,
    )
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True,
    )

    class Meta:
        model = Channel
        fields = [
            'id', 'name', 'description',
            'created_by', 'created_by_username',
            'created_at', 'messages_count',
        ]
        read_only_fields = ['created_by', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    """Сообщение + имя автора."""
    author_username = serializers.CharField(
        source='author.username', read_only=True,
    )

    class Meta:
        model = Message
        fields = [
            'id', 'channel', 'author', 'author_username',
            'text', 'created_at', 'updated_at',
        ]
        read_only_fields = ['author', 'created_at', 'updated_at']