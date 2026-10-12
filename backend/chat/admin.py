from django.contrib import admin

from .models import Channel, Message


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_by', 'created_at', 'messages_count')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)

    def messages_count(self, obj):
        return obj.messages.count()
    messages_count.short_description = 'Сообщений'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'channel', 'author', 'short_text', 'created_at')
    list_filter = ('channel', 'author')
    search_fields = ('text',)
    ordering = ('-created_at',)

    def short_text(self, obj):
        return obj.text[:60]
    short_text.short_description = 'Текст'