from django.conf import settings
from django.db import models


class Channel(models.Model):
    """Канал чата (аналог чата/группы в Telegram)."""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default='')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_channels',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Канал'
        verbose_name_plural = 'Каналы'

    def __str__(self):
        return self.name


class Message(models.Model):
    """Сообщение внутри канала."""
    channel = models.ForeignKey(
        Channel,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='messages',
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']  # старые сверху, как в Telegram
        verbose_name = 'Сообщение'
        verbose_name_plural = 'Сообщения'

    def __str__(self):
        return f'[{self.channel.name}] {self.author}: {self.text[:40]}'