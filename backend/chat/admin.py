from django.contrib import admin
from .models import Channel, Message, MessageRead


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'is_public',
                    'created_by_client_id', 'created_at', 'messages_count')
    list_filter = ('is_public',)
    search_fields = ('name', 'description', 'created_by_client_id')
    ordering = ('-created_at',)

    def messages_count(self, obj):
        return obj.messages.count()
    messages_count.short_description = 'Сообщений'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'channel', 'author_client_id', 'author_name',
                    'short_text', 'file_name', 'created_at')
    list_filter = ('channel',)
    search_fields = ('text', 'author_client_id', 'author_name')
    ordering = ('-created_at',)

    def short_text(self, obj):
        return obj.text[:60]
    short_text.short_description = 'Текст'


@admin.register(MessageRead)
class MessageReadAdmin(admin.ModelAdmin):
    list_display = ('id', 'message', 'client_id', 'read_at')
    list_filter = ('client_id',)